const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

process.env.EMAIL_LINK_SECRET = 'test-only-secret';
const json = (data, options = {}) => ({ data, status: options.status ?? 200 });
const nextServer = { NextResponse: { json } };

const product = {
  id: 'p1', name: 'Real Name', status: 'active', price_gbp: 10, price_ngn: 20000, price_usd: 12,
  sizes: ['S', 'M'], colors: [{ name: 'Black', hex: '#000' }], images: ['https://cdn.example/real.jpg'], stock_qty: 5,
};
const draft = { ...product, id: 'p-draft', status: 'draft' };

// Small stand-in for the Supabase query builder used by abandoned-carts.ts.
function fakeDb({ optOuts = [], carts = [] } = {}, calls = []) {
  return {
    from: (table) => {
      const filters = [];
      const rows = () => (table === 'email_opt_outs' ? optOuts.map((email) => ({ email })) : carts)
        .filter((row) => filters.every(([column, value]) => (Array.isArray(value) ? value.includes(row[column]) : row[column] === value)));
      const chain = {
        select: () => chain,
        eq: (column, value) => { filters.push([column, value]); return chain; },
        in: (column, values) => { filters.push([column, values]); return chain; },
        is: () => chain, lte: () => chain, gte: () => chain,
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (resolve) => resolve({ data: rows(), error: null }),
        upsert: async (row) => { calls.push([table, 'upsert', row]); return { error: null }; },
        delete: () => ({ eq: async (column, value) => { calls.push([table, 'delete', value]); return { error: null }; } }),
      };
      return chain;
    },
  };
}

test('email link tokens are bound to one address and one purpose', () => {
  const { createEmailLinkToken, verifyEmailLinkToken } = load('lib/server/email-links.ts');
  const token = createEmailLinkToken('restore-cart', ' Buyer@Example.com ');
  assert.equal(verifyEmailLinkToken('restore-cart', token), 'buyer@example.com');
  assert.equal(verifyEmailLinkToken('unsubscribe', token), null);
  const forged = `${Buffer.from('victim@example.com').toString('base64url')}.${token.split('.')[1]}`;
  assert.equal(verifyEmailLinkToken('restore-cart', forged), null);
  for (const bad of [null, '', 'abc', 'a.b.c', 'x'.repeat(2000)]) assert.equal(verifyEmailLinkToken('restore-cart', bad), null);
});

test('saved carts are rebuilt from the catalogue, never from browser-supplied details', () => {
  const { buildCartItemsFromCatalog } = load('lib/server/abandoned-carts.ts', { './supabase': {} });
  const items = buildCartItemsFromCatalog([
    { product_id: 'p1', size: 'M', color: 'Black', quantity: 500, product_name: 'FREE MONEY', image_url: 'https://evil.example/x.png', price_at_addition: 0 },
    { product_id: 'p-draft', size: 'M', color: 'Black', quantity: 1 },
    { product_id: 'unknown', size: 'M', color: 'Black', quantity: 1 },
    { product_id: 'p1', size: 'XXL', color: 'Black', quantity: 1 },
    { product_id: 'p1', size: 'S', color: 'Black', quantity: 0 },
    'junk',
  ], [product, draft]);
  assert.deepEqual(items, [{ product_id: 'p1', product_name: 'Real Name', quantity: 99, size: 'M', color: 'Black', price_at_addition: 10, image_url: 'https://cdn.example/real.jpg' }]);
  assert.equal(buildCartItemsFromCatalog(Array(80).fill({ product_id: 'p1', size: 'S', color: 'Black', quantity: 1 }), [product]).length, 50);
});

function loadSaveCart(state, calls) {
  return load('app/api/checkout/save-cart/route.ts', {
    'next/server': nextServer,
    './supabase': { getSupabaseAdmin: () => fakeDb(state, calls) },
    '@/lib/server/products': { getAllProducts: async () => [product] },
  });
}
const request = (body) => ({ json: async () => body });

test('saving a cart stores catalogue details and a server-computed subtotal', async () => {
  const calls = [];
  const result = await loadSaveCart({}, calls).POST(request({
    email: 'Buyer@Example.com', customerName: 'Ada\nLovelace', currency: 'NGN', subtotal: 1,
    items: [{ product_id: 'p1', size: 'S', color: 'Black', quantity: 2, product_name: 'Fake' }],
  }));
  assert.equal(result.data.saved, true);
  const [, , row] = calls.find(([table, action]) => table === 'abandoned_carts' && action === 'upsert');
  assert.equal(row.email, 'buyer@example.com');
  assert.equal(row.customer_name, 'Ada Lovelace');
  assert.equal(row.subtotal, 40000);
  assert.equal(row.items[0].product_name, 'Real Name');
});

test('no cart is saved for someone who unsubscribed, or for junk input', async () => {
  const calls = [];
  const route = loadSaveCart({ optOuts: ['buyer@example.com'] }, calls);
  const items = [{ product_id: 'p1', size: 'S', color: 'Black', quantity: 1 }];
  assert.equal((await route.POST(request({ email: 'buyer@example.com', currency: 'GBP', items }))).data.saved, false);
  assert.equal((await route.POST(request({ email: 'not-an-email', currency: 'GBP', items }))).data.saved, false);
  assert.equal((await route.POST(request({ email: 'x@example.com', currency: 'EUR', items }))).data.saved, false);
  assert.equal((await route.POST(request({ email: 'x@example.com', currency: 'GBP', items: [{ product_id: 'nope' }] }))).data.saved, false);
  assert.equal(calls.length, 0);
});

test('the restore link returns the saved bag (re-checked) but never the email address', async () => {
  const { createEmailLinkToken } = load('lib/server/email-links.ts');
  const carts = [{ id: 'buyer@example.com', email: 'buyer@example.com', items: [{ product_id: 'p1', size: 'M', color: 'Black', quantity: 1 }, { product_id: 'gone', size: 'M', color: 'Black', quantity: 1 }], currency: 'GBP', subtotal: 10, created_at: '2026-01-01', updated_at: '2026-01-01' }];
  const route = load('app/api/cart/restore/route.ts', {
    'next/server': nextServer,
    './supabase': { getSupabaseAdmin: () => fakeDb({ carts }) },
    '@/lib/server/products': { getAllProducts: async () => [product] },
  });
  const call = (token) => route.GET({ nextUrl: { searchParams: new URLSearchParams(token === null ? {} : { token }) } });
  assert.equal((await call(null)).status, 400);
  assert.equal((await call(createEmailLinkToken('unsubscribe', 'buyer@example.com'))).status, 400);
  const result = await call(createEmailLinkToken('restore-cart', 'buyer@example.com'));
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.items.map((item) => item.product_id), ['p1']);
  assert.ok(!JSON.stringify(result.data).includes('buyer@example.com'));
});

test('unsubscribing needs a valid token and a POST, and forgets the saved cart', async () => {
  const { createEmailLinkToken } = load('lib/server/email-links.ts');
  const calls = [];
  const route = load('app/api/email/unsubscribe/route.ts', { 'next/server': nextServer, './supabase': { getSupabaseAdmin: () => fakeDb({}, calls) } });
  assert.equal(route.GET, undefined);
  const call = (token) => route.POST({ nextUrl: { searchParams: new URLSearchParams({ token }) }, headers: { get: () => null } });
  assert.equal((await call(createEmailLinkToken('restore-cart', 'buyer@example.com'))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await call(createEmailLinkToken('unsubscribe', 'buyer@example.com'))).status, 200);
  assert.deepEqual(calls, [['email_opt_outs', 'upsert', { email: 'buyer@example.com' }], ['abandoned_carts', 'delete', 'buyer@example.com']]);
});

test('reminder emails carry signed restore and unsubscribe links, not the raw address', async () => {
  const sent = [];
  class Resend { emails = { send: async (payload) => { sent.push(payload); return { error: null }; } }; }
  process.env.RESEND_API_KEY = 'test-only';
  const { sendAbandonedCartRecoveryEmail } = load('lib/server/abandoned-cart-email.ts', { resend: { Resend } });
  const cart = { id: 'buyer@example.com', email: 'buyer@example.com', customerName: 'Ada', items: [{ product_id: 'p1', product_name: 'Real <b>Name</b>', size: 'M', color: 'Black', quantity: 1, image_url: '/img/a.jpg', price_at_addition: 10 }], currency: 'GBP', subtotal: 10 };
  assert.equal(await sendAbandonedCartRecoveryEmail(cart, 'https://shop.test'), true);
  const [payload] = sent;
  assert.match(payload.html, /https:\/\/shop\.test\/cart\?restore=[\w%.-]+/);
  assert.match(payload.html, /https:\/\/shop\.test\/unsubscribe\?token=/);
  assert.match(payload.html, /src="https:\/\/shop\.test\/img\/a\.jpg"/);
  assert.ok(payload.html.includes('Real &lt;b&gt;Name&lt;/b&gt;'));
  assert.match(payload.headers['List-Unsubscribe'], /^<https:\/\/shop\.test\/api\/email\/unsubscribe\?token=.+>$/);
  assert.equal(payload.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

function loadSendCoupon(signup, sent, marked = []) {
  class Resend { emails = { send: async (payload) => { sent.push(payload); return { error: null }; } }; }
  process.env.RESEND_API_KEY = 'test-only';
  return load('app/api/signups/send-coupon/route.ts', {
    'next/server': nextServer,
    resend: { Resend },
    '@/lib/server/signups': { getSignupForCouponEmail: async (id) => (id === 'signup-1' ? signup : null), markSignupEmailSent: async (id) => { marked.push(id); } },
    '@/lib/server/settings': { getStoreSettings: async () => ({ welcomeDiscountPercent: 15 }) },
  });
}
const couponRequest = (body) => ({ json: async () => body, nextUrl: { origin: 'https://shop.test' } });

test('the coupon email only ever sends a signup its own code, whatever the request says', async () => {
  const sent = [];
  const marked = [];
  const route = loadSendCoupon({ firstName: 'Ada', email: 'ada@example.com', couponCode: 'WELCOME-ABC234', lastSentAt: null }, sent, marked);
  const result = await route.POST(couponRequest({ signupId: 'signup-1', email: 'victim@example.com', couponCode: 'WELCOME-FAKE99', discountLabel: '100% off' }));
  assert.equal(result.status, 200);
  assert.equal(sent[0].to, 'ada@example.com');
  assert.ok(sent[0].html.includes('WELCOME-ABC234'));
  assert.ok(!sent[0].html.includes('WELCOME-FAKE99'));
  assert.match(sent[0].subject, /15% off/);
  assert.deepEqual(marked, ['signup-1']);
  assert.equal((await route.POST(couponRequest({ signupId: 'nope' }))).status, 404);
  assert.equal((await route.POST(couponRequest({}))).status, 400);
});

test('the coupon email can be re-sent at most once every five minutes', async () => {
  const sent = [];
  const recent = loadSendCoupon({ firstName: 'Ada', email: 'ada@example.com', couponCode: 'WELCOME-ABC234', lastSentAt: new Date(Date.now() - 60 * 1000) }, sent);
  assert.equal((await recent.POST(couponRequest({ signupId: 'signup-1' }))).status, 429);
  const older = loadSendCoupon({ firstName: 'Ada', email: 'ada@example.com', couponCode: 'WELCOME-ABC234', lastSentAt: new Date(Date.now() - 10 * 60 * 1000) }, sent);
  assert.equal((await older.POST(couponRequest({ signupId: 'signup-1' }))).status, 200);
  assert.equal(sent.length, 1);
});

test('signing up never returns the coupon code', async () => {
  const route = load('app/api/signups/route.ts', {
    'next/server': nextServer,
    '@/lib/server/admin-auth': { adminRoute: (handler) => handler },
    '@/lib/server/signups': { createOrGetSignup: async () => ({ signup: { id: 'signup-1', email: 'ada@example.com', coupon_code: 'WELCOME-ABC234', first_name: 'Ada' }, isNew: true }) },
  });
  const result = await route.POST(request({ firstName: 'Ada', lastName: 'L', email: 'ada@example.com' }));
  assert.deepEqual(result.data, { signup: { id: 'signup-1', email: 'ada@example.com' }, isNew: true });
});

test('emails use the configured sender and reply-to, and shop alerts reply to the customer', async () => {
  const saved = { from: process.env.RESEND_FROM_EMAIL, replyTo: process.env.EMAIL_REPLY_TO };
  try {
    delete process.env.RESEND_FROM_EMAIL; delete process.env.EMAIL_REPLY_TO;
    assert.deepEqual(load('lib/server/email-sender.ts').emailSender(), { from: 'Toymak <onboarding@resend.dev>' });
    process.env.RESEND_FROM_EMAIL = 'Toymak <orders@toymakenterprise.co.uk>';
    process.env.EMAIL_REPLY_TO = 'owner@example.com';
    assert.deepEqual(load('lib/server/email-sender.ts').emailSender(), { from: 'Toymak <orders@toymakenterprise.co.uk>', replyTo: 'owner@example.com' });
    const { prepareOrderEmail } = load('lib/server/order-email.ts', { resend: {}, './receipt-pdf': { generateReceiptPdf: async () => Buffer.from('pdf') } });
    const order = { id: 'o1', tracking_id: 'TMK-ABC123', customer_email: 'buyer@example.com', customer_name: 'Ada', items: [], currency: 'GBP', subtotal: 10, shipping_cost: 0, tax: 0, discount_applied: 0, total_amount: 10, payment_gateway: 'stripe', shipping_address: {} };
    const alert = await prepareOrderEmail(order, 'https://shop.test', 'admin', 'shop@example.com');
    assert.equal(alert.from, 'Toymak <orders@toymakenterprise.co.uk>');
    assert.equal(alert.replyTo, 'buyer@example.com');
    const confirmation = await prepareOrderEmail(order, 'https://shop.test', 'customer');
    assert.equal(confirmation.replyTo, 'owner@example.com');
  } finally {
    for (const [key, value] of [['RESEND_FROM_EMAIL', saved.from], ['EMAIL_REPLY_TO', saved.replyTo]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('without a verified Resend domain, email goes through the brand mailbox over verified TLS', async () => {
  const keys = ['RESEND_FROM_EMAIL', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_HOST', 'SMTP_PORT', 'EMAIL_REPLY_TO'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const transports = [];
  const sent = [];
  const nodemailer = { createTransport: (options) => { transports.push(options); return { sendMail: async (mail) => { sent.push(mail); } }; } };
  class Resend { emails = { send: async () => { throw new Error('Resend must not be used'); } }; }
  try {
    for (const key of keys) delete process.env[key];
    process.env.SMTP_USER = 'admin@toymakenterprise.co.uk';
    process.env.SMTP_PASSWORD = 'mailbox-password';
    delete globalThis.__toymakSmtpTransport;
    const sender = load('lib/server/email-sender.ts', { nodemailer, resend: { Resend } });
    assert.equal(sender.emailSender().from, 'Toymak <admin@toymakenterprise.co.uk>');
    assert.equal(sender.isEmailConfigured(), true);
    const result = await sender.sendEmail({ to: 'buyer@example.com', subject: 'Hi', html: '<p>Hi</p>', attachments: [{ filename: 'r.pdf', content: Buffer.from('pdf').toString('base64'), contentType: 'application/pdf' }] });
    assert.equal(result.error, null);
    assert.deepEqual(transports[0], { host: 'server112.web-hosting.com', port: 465, secure: true, auth: { user: 'admin@toymakenterprise.co.uk', pass: 'mailbox-password' } });
    assert.equal(sent[0].from, 'Toymak <admin@toymakenterprise.co.uk>');
    assert.equal(sent[0].attachments[0].content.toString(), 'pdf');

    // A verified Resend domain takes over automatically.
    process.env.RESEND_FROM_EMAIL = 'Toymak <orders@toymakenterprise.co.uk>';
    process.env.RESEND_API_KEY = 'test-only';
    const failed = await sender.sendEmail({ to: 'buyer@example.com', subject: 'Hi', html: '<p>Hi</p>' });
    assert.equal(failed.error, 'Resend must not be used');
    assert.equal(sent.length, 1);
  } finally {
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    delete globalThis.__toymakSmtpTransport;
  }
});

test('a mail server failure is reported, never thrown', async () => {
  const saved = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD, from: process.env.RESEND_FROM_EMAIL };
  const nodemailer = { createTransport: () => ({ sendMail: async () => { throw new Error('535 Incorrect authentication data'); } }) };
  try {
    delete process.env.RESEND_FROM_EMAIL;
    process.env.SMTP_USER = 'admin@toymakenterprise.co.uk';
    process.env.SMTP_PASSWORD = 'wrong';
    delete globalThis.__toymakSmtpTransport;
    const { sendEmail } = load('lib/server/email-sender.ts', { nodemailer, resend: {} });
    assert.deepEqual(await sendEmail({ to: 'buyer@example.com', subject: 'Hi', html: 'Hi' }), { error: '535 Incorrect authentication data' });
  } finally {
    for (const [key, value] of [['SMTP_USER', saved.user], ['SMTP_PASSWORD', saved.pass], ['RESEND_FROM_EMAIL', saved.from]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete globalThis.__toymakSmtpTransport;
  }
});
