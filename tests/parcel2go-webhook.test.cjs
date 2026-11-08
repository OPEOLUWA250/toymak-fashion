const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { load } = require('./helpers.cjs');

const hook = load('lib/server/parcel2go-webhook.ts');
const SECRET = 'test-signing-secret';

function signed(overrides = {}, signedTimestamp = '2026-11-10 14:05:09') {
  const body = {
    Id: 'e0363b4a-aead-4dd5-bcc5-73793ad49974',
    Timestamp: '2026-11-10T14:05:09.6386334+00:00',
    Type: 'Tracking',
    Payload: { OrderLineId: 12345678, Timestamp: '2026-11-10T14:00:00+00:00', StatusCode: 'OFD', StatusDescription: 'Out for delivery', TrackingStage: 'DeliveryScheduled' },
    ...overrides,
  };
  return { ...body, Signature: hook.signParcel2GoWebhook(body.Id, signedTimestamp, body.Type, SECRET) };
}

test('a correctly signed webhook verifies; a wrong secret or edited field does not', () => {
  const body = signed();
  assert.equal(hook.verifyParcel2GoWebhook(body, SECRET), true);
  assert.equal(hook.verifyParcel2GoWebhook({ ...body, Signature: body.Signature.toUpperCase() }, SECRET), true);
  assert.equal(hook.verifyParcel2GoWebhook(body, 'another-secret'), false);
  assert.equal(hook.verifyParcel2GoWebhook({ ...body, Type: 'Case' }, SECRET), false);
  assert.equal(hook.verifyParcel2GoWebhook({ ...body, Id: 'someone-else' }, SECRET), false);
  assert.equal(hook.verifyParcel2GoWebhook({ ...body, Signature: 'abc' }, SECRET), false);
});

test('the timestamp may be signed as sent or in UTC', () => {
  const body = signed({ Timestamp: '2026-07-10T15:05:09+01:00' }, '2026-07-10 14:05:09');
  assert.equal(hook.verifyParcel2GoWebhook(body, SECRET), true);
  const literal = signed({ Timestamp: '2026-07-10T15:05:09+01:00' }, '2026-07-10 15:05:09');
  assert.equal(hook.verifyParcel2GoWebhook(literal, SECRET), true);
});

test('tracking events are read; other types and bad P2G numbers are not', () => {
  assert.deepEqual(hook.trackingEvent(signed()), {
    orderLineId: '12345678', stage: 'DeliveryScheduled', at: '2026-11-10T14:00:00+00:00', description: 'Out for delivery',
  });
  assert.equal(hook.trackingEvent(signed({ Type: 'Case' })), null);
  assert.equal(hook.trackingEvent(signed({ Payload: { OrderLineId: 'DROP TABLE' } })), null);
});

// ---------- The route ----------

const savedSecret = process.env.PARCEL2GO_WEBHOOK_SECRET;
afterEach(() => {
  if (savedSecret === undefined) delete process.env.PARCEL2GO_WEBHOOK_SECRET; else process.env.PARCEL2GO_WEBHOOK_SECRET = savedSecret;
});

function loadRoute(apply = async () => 1) {
  const calls = [];
  const route = load('app/api/parcel2go/webhook/route.ts', {
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } },
    '@/lib/server/delivery-tracking': { applyParcel2GoTrackingEvent: async (event) => { calls.push(event); return apply(event); } },
  });
  const post = (body) => route.POST({ json: async () => body });
  return { post, calls };
}

const fresh = () => signed({ Timestamp: new Date().toISOString() }, new Date().toISOString().slice(0, 19).replace('T', ' '));

test('the webhook is refused until the secret is set, then only with a valid signature', async () => {
  delete process.env.PARCEL2GO_WEBHOOK_SECRET;
  const { post, calls } = loadRoute();
  assert.equal((await post(fresh())).status, 503);

  process.env.PARCEL2GO_WEBHOOK_SECRET = SECRET;
  assert.equal((await post({ ...fresh(), Signature: '00'.repeat(32) })).status, 401);
  assert.equal((await post({ hello: 'world' })).status, 400);
  assert.equal(calls.length, 0);

  const ok = await post(fresh());
  assert.equal(ok.status, 200);
  assert.equal(calls[0].orderLineId, '12345678');
});

test('case events and stale replays are acknowledged without changing anything', async () => {
  process.env.PARCEL2GO_WEBHOOK_SECRET = SECRET;
  const { post, calls } = loadRoute();
  const caseEvent = signed({ Type: 'Case', Timestamp: new Date().toISOString() }, new Date().toISOString().slice(0, 19).replace('T', ' '));
  assert.equal((await post(caseEvent)).status, 200);
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const stale = signed({ Timestamp: monthAgo }, monthAgo.slice(0, 19).replace('T', ' '));
  assert.equal((await post(stale)).status, 200);
  assert.equal(calls.length, 0);
});

test('a temporary failure asks Parcel2Go to retry', async () => {
  process.env.PARCEL2GO_WEBHOOK_SECRET = SECRET;
  const { post } = loadRoute(async () => { throw new Error('Parcel2Go API down'); });
  assert.equal((await post(fresh())).status, 500);
});

// ---------- Applying an event to the order ----------

test('a webhook stage ahead of the API moves the order on and emails the customer', async () => {
  const order = {
    id: 'order-1', status: 'shipped', parcel2go_reference: 'P2G12345678', shipping_address: { postalCode: 'M1 1AA' },
    delivery: { stage: 'at_depot', stageAt: null, estimatedDelivery: '2026-11-10T00:00:00.000Z', latestEvent: 'At depot', latestEventAt: null, problem: false, updatedAt: '' },
    delivery_notified_stage: null,
  };
  const saved = [];
  const notified = [];
  let lookedUp;
  const db = {
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        maybeSingle: async () => ({ data: { id: 'order-1' }, error: null }),
        in: (column, values) => { lookedUp = values; return Promise.resolve({ data: [{ id: 'order-1' }], error: null }); },
        update: (values) => { saved.push(values); return builder; },
        then: (resolve) => resolve({ error: null }),
      };
      return builder;
    },
  };
  const tracking = load('lib/server/delivery-tracking.ts', {
    './supabase': { getSupabaseAdmin: () => db },
    './order-store': { getServerOrderById: async () => order },
    './parcel2go': { ...load('lib/server/parcel2go.ts'), parcel2GoConfigured: () => true, fetchParcel2GoTracking: async () => null },
    './delivery-email': { sendDeliveryEmail: async (o, stage) => { notified.push(stage); return true; } },
  });

  const now = new Date().toISOString();
  const count = await tracking.applyParcel2GoTrackingEvent({ orderLineId: '12345678', stage: 'DeliveryScheduled', at: now, description: 'Out for delivery' });
  assert.equal(count, 1);
  assert.deepEqual(lookedUp, ['12345678', 'P2G12345678']);
  const tracked = saved.find((values) => values.delivery_tracking).delivery_tracking;
  assert.equal(tracked.stage, 'out_for_delivery');
  assert.equal(tracked.latestEvent, 'Out for delivery');
  assert.equal(tracked.estimatedDelivery, '2026-11-10T00:00:00.000Z');
  assert.deepEqual(notified, ['out_for_delivery']);
});
