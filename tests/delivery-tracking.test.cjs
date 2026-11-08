const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { load } = require('./helpers.cjs');

const NOW = Date.parse('2026-11-10T15:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3600 * 1000).toISOString();

// ---------- Reading Parcel2Go's answer ----------

const { toDeliveryTracking } = load('lib/server/parcel2go.ts');

test('the most advanced stage Parcel2Go has a time for wins', () => {
  const tracking = toDeliveryTracking({
    Stage: 'InTransit',
    DroppedOff: '2026-11-08T10:00:00',
    InTransit: '2026-11-09T08:00:00',
    AtDepot: '2026-11-10T05:00:00',
    DeliveryScheduled: '0001-01-01T00:00:00',
    Delivered: null,
    EstimatedDeliveryDate: '2026-11-11T00:00:00',
    Results: [
      { Timestamp: '2026-11-09T08:00:00', Description: 'In transit' },
      { Timestamp: '2026-11-10T05:00:00', Description: 'At Birmingham depot', Details: 'Sorted for delivery' },
    ],
  }, new Date(NOW));
  assert.equal(tracking.stage, 'at_depot');
  assert.equal(tracking.stageAt, '2026-11-10T05:00:00.000Z');
  assert.equal(tracking.latestEvent, 'At Birmingham depot — Sorted for delivery');
  assert.equal(tracking.estimatedDelivery, '2026-11-11T00:00:00.000Z');
  assert.equal(tracking.problem, false);
});

test('DeliveryScheduled means out for delivery', () => {
  assert.equal(toDeliveryTracking({ DeliveryScheduled: '2026-11-10T07:30:00' }).stage, 'out_for_delivery');
});

test('falls back to the Stage name, then to the latest scan wording', () => {
  assert.equal(toDeliveryTracking({ Stage: 'Collected' }).stage, 'collected');
  assert.equal(toDeliveryTracking({ Stage: 'Null', Results: [{ Timestamp: hoursAgo(1), Description: 'Parcel delivered to front door' }] }).stage, 'delivered');
  assert.equal(toDeliveryTracking({ Stage: 'Null', Results: [{ Timestamp: hoursAgo(1), Description: 'Out for delivery today' }] }).stage, 'out_for_delivery');
});

test('a failed delivery attempt is not "delivered"', () => {
  for (const text of ['Parcel could not be delivered', 'Attempted delivery, card left', 'Not delivered - nobody home']) {
    const tracking = toDeliveryTracking({ Stage: 'Null', IsInError: true, Results: [{ Timestamp: hoursAgo(1), Description: text }] });
    assert.notEqual(tracking.stage, 'delivered', text);
    assert.equal(tracking.problem, true);
  }
});

test('nothing scanned yet is "awaiting"', () => {
  const tracking = toDeliveryTracking({ Results: [], Stage: 'Null', UsesStages: false });
  assert.equal(tracking.stage, 'awaiting');
  assert.equal(tracking.latestEvent, null);
});

// ---------- References ----------

const { normalizeParcel2GoReference } = load('lib/delivery.ts');

test('references are tidied and anything odd is refused', () => {
  assert.equal(normalizeParcel2GoReference(' p2g 1234-5678 '), 'P2G12345678');
  assert.equal(normalizeParcel2GoReference('H01ABC2345678901'), 'H01ABC2345678901');
  assert.equal(normalizeParcel2GoReference('abc'), null);
  assert.equal(normalizeParcel2GoReference('https://evil.example/x'), null);
});

// ---------- Talking to Parcel2Go ----------

let requests;
let replies;
const savedEnv = { ...process.env };

beforeEach(() => {
  requests = [];
  replies = [];
  process.env.PARCEL2GO_CLIENT_ID = 'client-id';
  process.env.PARCEL2GO_CLIENT_SECRET = 'client-secret';
  delete process.env.PARCEL2GO_BASE_URL;
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith('/auth/connect/token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: `token-${requests.length}`, expires_in: 7200 }) };
    }
    const reply = replies.shift() ?? { status: 200, body: { Results: [], Stage: 'Null' } };
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
  };
});

afterEach(() => {
  process.env = { ...savedEnv };
});

test('looks up by tracking number and postcode, with one token for both calls', async () => {
  const { fetchParcel2GoTracking } = load('lib/server/parcel2go.ts');
  replies.push({ status: 200, body: { InTransit: '2026-11-09T08:00:00', Results: [{ Timestamp: '2026-11-09T08:00:00', Description: 'In transit' }] } });
  const first = await fetchParcel2GoTracking('H01ABC123', 'sw1a 1aa');
  assert.equal(first.stage, 'in_transit');
  assert.match(requests[1].url, /\/api\/tracking\/H01ABC123\/SW1A1AA$/);
  assert.equal(requests[1].init.headers.Authorization, 'Bearer token-1');

  await fetchParcel2GoTracking('H01ABC123', 'SW1A1AA');
  assert.equal(requests.filter((r) => r.url.endsWith('/auth/connect/token')).length, 1);
});

test('a P2G order number falls back to the order-line lookup', async () => {
  const { fetchParcel2GoTracking } = load('lib/server/parcel2go.ts');
  replies.push({ status: 404, body: {} });
  replies.push({ status: 200, body: { Delivered: '2026-11-10T12:00:00' } });
  const tracking = await fetchParcel2GoTracking('P2G12345678', 'M1 1AA');
  assert.equal(tracking.stage, 'delivered');
  assert.match(requests.at(-1).url, /\/api\/tracking\/12345678\?postcode=M11AA$/);
});

test('no tracking yet is null, but every lookup failing is an error', async () => {
  const { fetchParcel2GoTracking } = load('lib/server/parcel2go.ts');
  assert.equal(await fetchParcel2GoTracking('H01ABC123', 'M1 1AA'), null);

  replies.push({ status: 500, body: {} });
  await assert.rejects(fetchParcel2GoTracking('H01ABC123', 'M1 1AA'), /HTTP 500/);
});

test('an expired token is replaced once', async () => {
  const { fetchParcel2GoTracking } = load('lib/server/parcel2go.ts');
  replies.push({ status: 401, body: {} });
  replies.push({ status: 200, body: { Collected: '2026-11-09T08:00:00' } });
  assert.equal((await fetchParcel2GoTracking('H01ABC123', 'M1 1AA')).stage, 'collected');
  assert.equal(requests.filter((r) => r.url.endsWith('/auth/connect/token')).length, 2);
});

// ---------- Customer emails ----------

function shippedOrder(overrides = {}) {
  return {
    id: 'order-1',
    tracking_id: 'TMK-ABC123',
    status: 'shipped',
    customer_name: 'Ada Lovelace',
    customer_email: 'ada@example.com',
    shipping_address: { postalCode: 'M1 1AA' },
    items: [{ product_name: 'Waist Trainer', size: 'M', color: 'Black', quantity: 1 }],
    parcel2go_reference: 'P2G12345678',
    delivery: null,
    delivery_notified_stage: null,
    ...overrides,
  };
}

function tracking(stage, at) {
  return { stage, stageAt: at, estimatedDelivery: null, latestEvent: null, latestEventAt: at, problem: false, updatedAt: at };
}

function loadTracking({ sendResult = true } = {}) {
  const db = { stage: null, sent: [] };
  const query = () => {
    const filters = [];
    let update;
    const builder = {
      update(values) { update = values; return builder; },
      eq(column, value) { filters.push([column, value]); return builder; },
      is(column, value) { filters.push([column, value]); return builder; },
      select() { return builder; },
      async maybeSingle() {
        const stageFilter = filters.find(([column]) => column === 'delivery_notified_stage');
        if (stageFilter && stageFilter[1] !== db.stage) return { data: null, error: null };
        if (update && 'delivery_notified_stage' in update) db.stage = update.delivery_notified_stage;
        return { data: { id: 'order-1' }, error: null };
      },
      then(resolve) { return builder.maybeSingle().then(resolve); },
    };
    return builder;
  };
  const module = load('lib/server/delivery-tracking.ts', {
    './supabase': { getSupabaseAdmin: () => ({ from: query }) },
    './order-store': { getServerOrderById: async () => null },
    './parcel2go': { parcel2GoConfigured: () => true, fetchParcel2GoTracking: async () => null },
    './delivery-email': { sendDeliveryEmail: async (order, stage) => { db.sent.push(stage); return sendResult; } },
  });
  return { ...module, db };
}

test('an email is due only for fresh out-for-delivery and delivered stages', () => {
  const { deliveryNoticeDue } = loadTracking();
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: tracking('in_transit', hoursAgo(1)) }), NOW), null);
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: tracking('out_for_delivery', hoursAgo(2)) }), NOW), 'out_for_delivery');
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: tracking('out_for_delivery', hoursAgo(30)) }), NOW), null);
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: tracking('delivered', hoursAgo(30)) }), NOW), 'delivered');
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: tracking('delivered', hoursAgo(24 * 5)) }), NOW), null);
});

test('each email goes once, and out-for-delivery never follows delivered', () => {
  const { deliveryNoticeDue } = loadTracking();
  const ofd = tracking('out_for_delivery', hoursAgo(1));
  const done = tracking('delivered', hoursAgo(1));
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: ofd, delivery_notified_stage: 'out_for_delivery' }), NOW), null);
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: done, delivery_notified_stage: 'out_for_delivery' }), NOW), 'delivered');
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: done, delivery_notified_stage: 'delivered' }), NOW), null);
  assert.equal(deliveryNoticeDue(shippedOrder({ delivery: done, status: 'unshipped' }), NOW), null);
});

test('notifyDelivery claims the order before sending, so a second check sends nothing', async () => {
  const { notifyDelivery, db } = loadTracking();
  const order = shippedOrder({ delivery: tracking('delivered', new Date().toISOString()) });
  assert.equal(await notifyDelivery(order), 'delivered');
  assert.equal(await notifyDelivery(order), null);
  assert.deepEqual(db.sent, ['delivered']);
  assert.equal(db.stage, 'delivered');
});

test('a failed send is released for the next check', async () => {
  const { notifyDelivery, db } = loadTracking({ sendResult: false });
  const order = shippedOrder({ delivery: tracking('out_for_delivery', new Date().toISOString()) });
  assert.equal(await notifyDelivery(order), null);
  assert.equal(db.stage, null);
});

// ---------- The email itself ----------

test('the delivery email is addressed to the customer and escapes their details', () => {
  const { buildDeliveryEmail } = load('lib/server/delivery-email.ts', { './email-sender': { sendEmail: async () => ({ error: null }) } });
  const email = buildDeliveryEmail(shippedOrder({ customer_name: '<b>Ada</b> L' }), 'out_for_delivery', 'https://toymakfashion.com');
  assert.equal(email.to, 'ada@example.com');
  assert.match(email.subject, /TMK-ABC123 is out for delivery/);
  assert.match(email.html, /&lt;b&gt;Ada&lt;\/b&gt;/);
  assert.match(email.html, /track-order\?email=ada%40example\.com&order=TMK-ABC123/);
});
