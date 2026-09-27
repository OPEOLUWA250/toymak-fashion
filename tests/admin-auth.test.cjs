const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers.cjs');

const json = (data, options = {}) => ({ data, status: options.status ?? 200 });
const nextServer = { NextResponse: { json, redirect: (url) => ({ redirect: String(url), status: 307 }) } };
const withAdmins = (value, fn) => async () => {
  const original = process.env.ADMIN_EMAILS;
  if (value === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = value;
  try { await fn(); } finally { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; }
};

// Minimal stand-in for the admin_users query chain used by admin-roles.ts.
function fakeDb(rows = []) {
  return {
    from: () => {
      const filters = [];
      const chain = {
        select: () => chain,
        eq: (column, value) => { filters.push([column, value]); return chain; },
        maybeSingle: async () => ({ data: rows.find((row) => filters.every(([column, value]) => row[column] === value)) ?? null, error: null }),
      };
      return chain;
    },
  };
}

function loadAdminAuth(getUser, rows = [], actors = []) {
  return load('lib/server/admin-auth.ts', {
    'next/server': nextServer,
    'next/headers': { cookies: async () => ({ getAll: () => [], set: () => {} }) },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser } }) },
    './supabase': { getSupabaseAdmin: () => fakeDb(rows), runAsAdmin: (email, fn) => { actors.push(email); return fn(); } },
  });
}

// Calls a handler wrapped in adminRoute and returns its response.
const callAdminRoute = (auth, options) => auth.adminRoute(async (_request, _context, session) => json({ email: session.email }), options)({}, {});

test('super admin list fails closed when ADMIN_EMAILS is missing or empty', withAdmins(undefined, () => {
  const { isSuperAdminEmail } = load('lib/server/admin-emails.ts');
  assert.equal(isSuperAdminEmail('owner@example.com'), false);
  process.env.ADMIN_EMAILS = ' , ';
  assert.equal(isSuperAdminEmail('owner@example.com'), false);
  assert.equal(isSuperAdminEmail(''), false);
}));

test('super admin list ignores case and whitespace', withAdmins(' Owner@Example.com , staff@example.com', () => {
  const { isSuperAdminEmail } = load('lib/server/admin-emails.ts');
  assert.equal(isSuperAdminEmail('owner@example.com '), true);
  assert.equal(isSuperAdminEmail('STAFF@example.com'), true);
  assert.equal(isSuperAdminEmail('someone@example.com'), false);
}));

test('only a confirmed super admin or listed admin gets a session', withAdmins('owner@example.com', async () => {
  const confirmed = { id: 'u-owner', email: 'owner@example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  assert.equal((await loadAdminAuth(async () => ({ data: { user: confirmed }, error: null })).getAdmin()).email, 'owner@example.com');
  assert.equal(await loadAdminAuth(async () => ({ data: { user: { ...confirmed, email: 'shopper@example.com' } }, error: null })).getAdmin(), null);
  assert.equal(await loadAdminAuth(async () => ({ data: { user: { ...confirmed, email_confirmed_at: null } }, error: null })).getAdmin(), null);
  assert.equal(await loadAdminAuth(async () => ({ data: { user: null }, error: { message: 'no session' } })).getAdmin(), null);
  assert.equal(await loadAdminAuth(async () => { throw new Error('auth down'); }).getAdmin(), null);
  assert.equal((await callAdminRoute(loadAdminAuth(async () => ({ data: { user: null }, error: null })))).status, 401);
}));

test('admins created in the dashboard are recognised by id and email, not email alone', withAdmins('owner@example.com', async () => {
  const staff = { id: 'u-staff', email: 'Staff@Example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  const rows = [{ id: 'u-staff', email: 'staff@example.com' }];
  assert.equal((await loadAdminAuth(async () => ({ data: { user: staff }, error: null }), rows).getAdminSession()).role, 'admin');
  assert.equal(await loadAdminAuth(async () => ({ data: { user: { ...staff, id: 'u-impostor' } }, error: null }), rows).getAdminSession(), null);
  const owner = await loadAdminAuth(async () => ({ data: { user: { ...staff, id: 'u-owner', email: 'owner@example.com' } }, error: null }), rows).getAdminSession();
  assert.equal(owner.role, 'super_admin');
}));

test('an admin on a temporary password is blocked from everything but changing it', withAdmins('', async () => {
  const pending = { id: 'u-new', email: 'new@example.com', email_confirmed_at: '2026-01-01', app_metadata: { must_change_password: true } };
  const auth = loadAdminAuth(async () => ({ data: { user: pending }, error: null }), [{ id: 'u-new', email: 'new@example.com' }]);
  assert.equal((await auth.getAdminSession()).mustChangePassword, true);
  assert.equal(await auth.getAdmin(), null);
  assert.equal((await callAdminRoute(auth)).status, 403);
}));

test('only super admins pass the super-admin guard', withAdmins('owner@example.com', async () => {
  const staff = { id: 'u-staff', email: 'staff@example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  const staffAuth = loadAdminAuth(async () => ({ data: { user: staff }, error: null }), [{ id: 'u-staff', email: 'staff@example.com' }]);
  assert.equal((await callAdminRoute(staffAuth, { superAdmin: true })).status, 403);
  assert.equal((await callAdminRoute(staffAuth)).status, 200);
  const ownerAuth = loadAdminAuth(async () => ({ data: { user: { ...staff, id: 'u-owner', email: 'owner@example.com' } }, error: null }));
  assert.equal((await callAdminRoute(ownerAuth, { superAdmin: true })).status, 200);
}));

test('admin route handlers run with their database writes attributed to the admin', withAdmins('owner@example.com', async () => {
  const actors = [];
  const owner = { id: 'u-owner', email: 'Owner@Example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  const result = await callAdminRoute(loadAdminAuth(async () => ({ data: { user: owner }, error: null }), [], actors));
  assert.equal(result.data.email, 'owner@example.com');
  assert.deepEqual(actors, ['owner@example.com']);
}));

// Every admin handler must reject before touching data. Each route's own
// imports are replaced with stubs that throw if anything is called.
const guarded = [
  ['app/api/orders/route.ts', ['GET']],
  ['app/api/admin/activity/route.ts', ['GET']],
  ['app/api/admin/events/route.ts', ['GET']],
  ['app/api/admin/orders/[id]/route.ts', ['PUT']],
  ['app/api/admin/products/route.ts', ['POST', 'GET']],
  ['app/api/admin/products/[id]/route.ts', ['PUT', 'DELETE']],
  ['app/api/admin/reviews/route.ts', ['GET']],
  ['app/api/admin/reviews/[id]/route.ts', ['PUT', 'DELETE']],
  ['app/api/admin/upload-image/route.ts', ['POST']],
  ['app/api/admin/admins/route.ts', ['GET', 'POST', 'PATCH', 'DELETE']],
  ['app/api/signups/route.ts', ['GET']],
  ['app/api/contact/route.ts', ['GET']],
  ['app/api/contact/[id]/route.ts', ['PATCH']],
  ['app/api/settings/route.ts', ['PUT']],
  ['app/api/auth/password/route.ts', ['POST']],
];

test('every admin route rejects a request without an admin session', async () => {
  const explode = (name) => new Proxy({}, { get: (_, key) => key === '__esModule' ? undefined : () => { throw new Error(`Must not call ${name}.${String(key)}`); } });
  const request = { json: async () => { throw new Error('Must not read body'); }, formData: async () => { throw new Error('Must not read body'); }, signal: { addEventListener() {} } };
  const context = { params: Promise.resolve({ id: 'x' }) };
  const unauthorized = () => json({ error: 'Admin sign-in required.' }, { status: 401 });
  for (const [file, methods] of guarded) {
    const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    const mocks = {
      'next/server': nextServer,
      '@/lib/server/admin-auth': { adminRoute: () => async () => unauthorized(), getAdmin: async () => null, getAdminSession: async () => null },
    };
    for (const [, specifier] of source.matchAll(/from ['"]([^'"]+)['"]/g)) if (!(specifier in mocks) && specifier !== 'node:crypto') mocks[specifier] = explode(specifier);
    const route = load(file, mocks);
    for (const method of methods) {
      assert.equal(typeof route[method], 'function', `${file} ${method}`);
      assert.equal((await route[method](request, context)).status, 401, `${file} ${method}`);
    }
  }
});

test('public settings hide the admin notification email', async () => {
  const settings = { tax: {}, orderNotificationEmail: 'owner@example.com' };
  const loadRoute = (admin) => load('app/api/settings/route.ts', { 'next/server': nextServer, '@/lib/server/settings': { getStoreSettings: async () => settings }, '@/lib/server/admin-auth': { getAdmin: async () => admin, adminRoute: (handler) => handler } });
  assert.equal((await loadRoute(null).GET()).data.settings.orderNotificationEmail, '');
  assert.equal((await loadRoute({ email: 'owner@example.com' }).GET()).data.settings.orderNotificationEmail, 'owner@example.com');
});

test('login refuses non-admin emails without contacting Supabase', async () => {
  const route = load('app/api/auth/login/route.ts', {
    'next/server': nextServer,
    '@/lib/server/admin-auth': { isAllowedAdminEmail: async (e) => e === 'owner@example.com', adminAuthClient: async () => { throw new Error('Must not sign in'); } },
    '@/lib/server/admin-roles': {},
  });
  const result = await route.POST({ json: async () => ({ email: 'shopper@example.com', password: 'whatever-password' }) });
  assert.equal(result.status, 401);
  assert.equal(result.data.error, 'Incorrect email or password.');
});

test('auth callback never redirects outside the admin area', async () => {
  const route = load('app/api/auth/callback/route.ts', { 'next/server': nextServer, '@/lib/server/admin-auth': { adminAuthClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) } });
  const call = (next) => route.GET({ url: 'https://shop.test/api/auth/callback', nextUrl: { searchParams: new URLSearchParams({ code: 'c', next }) } });
  assert.equal((await call('//evil.example/x')).redirect, 'https://shop.test/admin');
  assert.equal((await call('https://evil.example')).redirect, 'https://shop.test/admin');
  assert.equal((await call('/admin/reset-password')).redirect, 'https://shop.test/admin/reset-password');
});

function runProxy(pathname, user) {
  const redirects = [];
  const response = () => ({ cookies: { set() {}, getAll: () => [] }, headers: { set() {} } });
  const { proxy } = load('proxy.ts', {
    'next/server': { NextResponse: { next: response, redirect: (url) => { redirects.push(url); return { redirect: url }; } } },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    './supabase': { getSupabaseAdmin: () => fakeDb([{ id: 'u-new', email: 'new@example.com' }]), runAsAdmin: (email, fn) => fn() },
  });
  const nextUrl = { pathname, search: '', clone: () => ({ pathname, search: '' }) };
  return proxy({ nextUrl, cookies: { getAll: () => [], set() {} } }).then((result) => ({ result, redirects }));
}

test('proxy sends non-admins to login and admins away from it', withAdmins('owner@example.com', async () => {
  const admin = { id: 'u-owner', email: 'owner@example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  const anonymous = await runProxy('/admin', null);
  assert.equal(anonymous.redirects[0].pathname, '/admin/login');
  assert.equal(anonymous.redirects[0].search, '?next=%2Fadmin');
  const shopper = await runProxy('/admin/reset-password', { ...admin, id: 'u-shopper', email: 'shopper@example.com' });
  assert.equal(shopper.redirects[0].pathname, '/admin/login');
  assert.equal((await runProxy('/admin/login', null)).redirects.length, 0);
  assert.equal((await runProxy('/admin', admin)).redirects.length, 0);
  assert.equal((await runProxy('/admin/login', admin)).redirects[0].pathname, '/admin');
}));

test('proxy keeps an admin on a temporary password on the reset page', withAdmins('owner@example.com', async () => {
  const pending = { id: 'u-new', email: 'new@example.com', email_confirmed_at: '2026-01-01', app_metadata: { must_change_password: true } };
  assert.equal((await runProxy('/admin', pending)).redirects[0].pathname, '/admin/reset-password');
  assert.equal((await runProxy('/admin/login', pending)).redirects[0].pathname, '/admin/reset-password');
  assert.equal((await runProxy('/admin/reset-password', pending)).redirects.length, 0);
}));

// --- Admins API (super admin only) ---
function loadAdminsRoute({ rows = [], insertError = null, calls = [] } = {}) {
  const db = {
    from: () => {
      const filters = [];
      const chain = {
        select: () => chain,
        eq: (column, value) => { filters.push([column, value]); return chain; },
        maybeSingle: async () => ({ data: rows.find((row) => filters.every(([c, v]) => row[c] === v)) ?? null, error: null }),
        insert: async (row) => { calls.push(['insert', row]); return { error: insertError }; },
        update: (value) => ({ eq: async (column, id) => { calls.push(['update', value, id]); return { error: null }; } }),
        delete: () => ({ eq: async (column, value) => { calls.push(['deleteRow', value]); return { error: null }; } }),
      };
      return chain;
    },
    auth: { admin: {
      createUser: async (input) => { calls.push(['createUser', input]); return { data: { user: { id: 'u-created' } }, error: null }; },
      deleteUser: async (id) => { calls.push(['deleteUser', id]); return { error: null }; },
      updateUserById: async (id, input) => { calls.push(['updateUser', id, input]); return { error: null }; },
    } },
  };
  const session = { user: { id: 'u-owner' }, email: 'owner@example.com', role: 'super_admin', mustChangePassword: false };
  return load('app/api/admin/admins/route.ts', {
    'next/server': nextServer,
    '@/lib/server/admin-auth': {
      adminRoute: (handler, options) => {
        assert.equal(options?.superAdmin, true, 'every admins handler must require a super admin');
        return (request, context) => handler(request, context, session);
      },
    },
    '@/lib/server/supabase': { getSupabaseAdmin: () => db },
  });
}
const body = (value) => ({ json: async () => value });

test('adding an admin creates a confirmed user who must change the temporary password', withAdmins('owner@example.com', async () => {
  const calls = [];
  const result = await loadAdminsRoute({ calls }).POST(body({ email: ' New@Example.com ', password: 'temporary-pass-1' }));
  assert.equal(result.status, 200);
  const [, input] = calls.find(([name]) => name === 'createUser');
  assert.equal(input.email, 'new@example.com');
  assert.equal(input.email_confirm, true);
  assert.deepEqual(input.app_metadata, { must_change_password: true });
  assert.deepEqual(calls.find(([name]) => name === 'insert')[1], { id: 'u-created', email: 'new@example.com', role: 'admin', created_by: 'owner@example.com' });
}));

test('a super admin can add another super admin, but not an unknown role', withAdmins('owner@example.com', async () => {
  const calls = [];
  const route = loadAdminsRoute({ calls });
  assert.equal((await route.POST(body({ email: 'next-owner@example.com', password: 'temporary-pass-1', role: 'super_admin' }))).status, 200);
  assert.equal(calls.find(([name]) => name === 'insert')[1].role, 'super_admin');
  assert.equal((await route.POST(body({ email: 'x@example.com', password: 'temporary-pass-1', role: 'owner' }))).status, 400);
}));

test('super admins can promote and demote others, never themselves or owners', withAdmins('owner@example.com', async () => {
  const calls = [];
  const rows = [{ id: 'u-staff', email: 'staff@example.com' }, { id: 'u-owner', email: 'self-row@example.com' }];
  const route = loadAdminsRoute({ calls, rows });
  assert.equal((await route.PATCH(body({ id: 'u-staff', role: 'super_admin' }))).status, 200);
  assert.deepEqual(calls.find(([name]) => name === 'update'), ['update', { role: 'super_admin' }, 'u-staff']);
  assert.equal((await route.PATCH(body({ id: 'u-owner', role: 'admin' }))).status, 400);
  assert.equal((await route.PATCH(body({ id: 'u-not-listed', role: 'admin' }))).status, 404);
  assert.equal((await route.PATCH(body({ id: 'u-staff', role: 'owner' }))).status, 400);
}));

test('a super admin stored in the database is recognised as one', withAdmins('owner@example.com', async () => {
  const deputy = { id: 'u-deputy', email: 'deputy@example.com', email_confirmed_at: '2026-01-01', app_metadata: {} };
  const auth = loadAdminAuth(async () => ({ data: { user: deputy }, error: null }), [{ id: 'u-deputy', email: 'deputy@example.com', role: 'super_admin' }]);
  assert.equal((await auth.getAdminSession()).role, 'super_admin');
  assert.equal((await callAdminRoute(auth, { superAdmin: true })).status, 200);
}));

test('adding an admin rolls back the login if saving the admin fails', withAdmins('owner@example.com', async () => {
  const calls = [];
  const result = await loadAdminsRoute({ calls, insertError: { message: 'boom' } }).POST(body({ email: 'new@example.com', password: 'temporary-pass-1' }));
  assert.equal(result.status, 500);
  assert.deepEqual(calls.find(([name]) => name === 'deleteUser'), ['deleteUser', 'u-created']);
}));

test('adding an admin rejects short passwords, super admins and duplicates', withAdmins('owner@example.com', async () => {
  const route = loadAdminsRoute({ rows: [{ id: 'u-staff', email: 'staff@example.com' }] });
  assert.equal((await route.POST(body({ email: 'new@example.com', password: 'short' }))).status, 400);
  assert.equal((await route.POST(body({ email: 'OWNER@example.com', password: 'temporary-pass-1' }))).status, 409);
  assert.equal((await route.POST(body({ email: 'staff@example.com', password: 'temporary-pass-1' }))).status, 409);
}));

test('super admins cannot be removed from the dashboard, and nobody can remove themselves', withAdmins('owner@example.com', async () => {
  const calls = [];
  const route = loadAdminsRoute({ calls, rows: [{ id: 'u-staff', email: 'staff@example.com' }] });
  assert.equal((await route.DELETE(body({ id: 'u-owner' }))).status, 400);
  assert.equal((await route.DELETE(body({ id: 'u-unknown' }))).status, 404);
  assert.equal(calls.length, 0);
  assert.equal((await route.DELETE(body({ id: 'u-staff' }))).status, 200);
  assert.deepEqual(calls.map(([name]) => name), ['deleteRow', 'deleteUser']);
}));

test('resetting an admin password forces them to choose a new one', withAdmins('owner@example.com', async () => {
  const calls = [];
  const route = loadAdminsRoute({ calls, rows: [{ id: 'u-staff', email: 'staff@example.com' }] });
  assert.equal((await route.PATCH(body({ id: 'u-staff', password: 'another-temp-12' }))).status, 200);
  assert.deepEqual(calls[0], ['updateUser', 'u-staff', { password: 'another-temp-12', app_metadata: { must_change_password: true } }]);
}));
