const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { load } = require('./helpers.cjs');

const realClient = load('lib/server/royal-mail.ts');
const { RoyalMailRefusal } = realClient;

const SETTINGS = {
  autoSend: true,
  standardService: '',
  standardServiceName: '',
  expressService: '',
  expressServiceName: '',
  packageFormat: 'smallParcel',
  fallbackWeightKg: 0.5,
};

const SERVICES = [
  { code: 'TPS48', name: 'Royal Mail Tracked 48' },
  { code: 'TPC48', name: 'Royal Mail Tracked 48 Age Verification' },
  { code: 'TPN24', name: 'Royal Mail Tracked 24' },
  { code: 'CRL48', name: 'Royal Mail 2nd Class' },
];

function ukOrder(overrides = {}) {
  return {
    id: 'ord-1',
    tracking_id: 'TMK-ABC123',
    status: 'unshipped',
    customer_name: 'Funmi Davies',
    customer_email: 'funmi@example.com',
    customer_phone: '07111111111',
    shipping_address: { fullName: 'Funmi Davies', email: '', phone: '', street: 'Flat 4, 27 Harehills Lane', city: 'Leeds', state: 'West Yorkshire', postalCode: 'ls7 1sw', country: 'United Kingdom', shippingMethod: 'standard' },
    items: [{ product_name: 'Waist Trainer', quantity: 2, size: 'M', color: 'Black', unit_price: 12, weight_kg: 0.4 }],
    subtotal: 24,
    shipping_cost: 3.99,
    total_amount: 27.99,
    currency: 'GBP',
    tracking_number: null,
    tracking_link: null,
    royal_mail: null,
    shipped_email_sent_at: null,
    created_at: '2026-11-09T18:00:00.000Z',
    ...overrides,
  };
}

/** A tiny stand-in for the Supabase query builder, over in-memory rows. */
function fakeSupabase(state) {
  const read = (row, column) => {
    if (column.includes('->>')) {
      const [field, key] = column.split('->>');
      return row[field]?.[key] ?? null;
    }
    return row[column] ?? null;
  };
  return {
    from(table) {
      const filters = [];
      let update = null;
      const run = () => {
        const rows = table === 'orders' ? Object.values(state.orders) : [state.settingsRow];
        const matched = rows.filter((row) => filters.every((keep) => keep(row)));
        if (update) for (const row of matched) Object.assign(row, structuredClone(update));
        if (update) state.writes.push({ table, update: structuredClone(update), matched: matched.length });
        return matched;
      };
      const builder = {
        select() { return builder; },
        update(values) { update = values; return builder; },
        eq(column, value) { filters.push((row) => read(row, column) === value); return builder; },
        is(column, value) { filters.push((row) => read(row, column) === value); return builder; },
        gte(column, value) { filters.push((row) => String(read(row, column)) >= value); return builder; },
        async maybeSingle() { const rows = run(); return { data: rows[0] ? { id: rows[0].id } : null, error: null }; },
        async single() { const rows = run(); return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'no row' } }; },
        then(resolve, reject) { return Promise.resolve({ data: run(), error: null }).then(resolve, reject); },
      };
      return builder;
    },
  };
}

function setup({ settings = SETTINGS, orders = [ukOrder()], client = {}, emailWorks = true } = {}) {
  const state = {
    orders: Object.fromEntries(orders.map((order) => [order.id, structuredClone(order)])),
    settingsRow: { id: 'default', royal_mail: structuredClone(settings) },
    writes: [],
    calls: [],
    emails: [],
    clickAndDrop: [],
  };
  const fakeClient = {
    ...realClient,
    royalMailConfigured: () => true,
    listRoyalMailServices: async (parcel) => { state.calls.push(['services', parcel]); return SERVICES; },
    createRoyalMailOrder: async (body) => {
      state.calls.push(['create', body]);
      const created = { orderIdentifier: 1001 + state.clickAndDrop.length, orderReference: body.orderReference };
      state.clickAndDrop.push(created);
      return created;
    },
    getRoyalMailOrders: async (ids) => {
      state.calls.push(['get', ids]);
      return state.clickAndDrop.filter((order) => ids.includes(order.orderIdentifier) || ids.includes(order.orderReference));
    },
    ...client,
  };
  const shipping = load('lib/server/royal-mail-orders.ts', {
    './supabase': { getSupabaseAdmin: () => fakeSupabase(state) },
    './order-store': { getServerOrderById: async (id) => (state.orders[id] ? structuredClone(state.orders[id]) : null) },
    './royal-mail': fakeClient,
    './shipped-email': { sendShippedEmail: async (order) => { state.emails.push(order.tracking_number); return emailWorks; } },
  });
  return { ...shipping, state, calls: () => state.calls.map(([name]) => name) };
}

// ---------- Choosing the service and the parcel ----------

test('Tracked 48 for standard and Tracked 24 for express, the plain version', () => {
  const { pickTrackedService } = realClient;
  assert.equal(pickTrackedService(SERVICES, false).code, 'TPS48');
  assert.equal(pickTrackedService(SERVICES, true).code, 'TPN24');
  // Only a variant on offer: still Tracked 48.
  assert.equal(pickTrackedService([{ code: 'TPC48', name: 'Royal Mail Tracked 48 Age Verification' }], false).code, 'TPC48');
  assert.equal(pickTrackedService([{ code: 'TSS', name: 'Tracked Returns 48' }, { code: 'CRL48', name: '2nd Class' }], false), undefined);
});

test('heavy orders move up a size', () => {
  const { packageFormatFor } = load('lib/royal-mail.ts');
  assert.equal(packageFormatFor(800, 'smallParcel'), 'smallParcel');
  assert.equal(packageFormatFor(2400, 'smallParcel'), 'mediumParcel');
  assert.equal(packageFormatFor(500, 'largeLetter'), 'largeLetter');
  assert.equal(packageFormatFor(900, 'largeLetter'), 'smallParcel');
});

test('tracking numbers are tidied and anything odd is refused', () => {
  const { normalizeTrackingNumber, royalMailTrackingUrl } = load('lib/royal-mail.ts');
  assert.equal(normalizeTrackingNumber(' mz 5846-2566 0gb '), 'MZ584625660GB');
  assert.equal(normalizeTrackingNumber('abc'), null);
  assert.equal(normalizeTrackingNumber('https://evil.example/x'), null);
  assert.equal(royalMailTrackingUrl('MZ584625660GB'), 'https://www.royalmail.com/track-your-item#/tracking-results/MZ584625660GB');
});

test('the Click & Drop order carries the address, weight, items and our order number', () => {
  const { buildRoyalMailOrder, parcelGrams } = setup();
  const order = ukOrder({ items: [...ukOrder().items, { product_name: 'Old item', quantity: 1, size: 'S', color: 'Nude', unit_price: 10 }] });
  const grams = parcelGrams(order, 0.5);
  assert.equal(grams, 1300, 'two at 0.4 kg, plus one with no weight at the 0.5 kg fallback');
  const body = buildRoyalMailOrder(order, { code: 'TPS48', name: 'Royal Mail Tracked 48' }, grams, 'smallParcel', 0.5);
  assert.equal(body.orderReference, 'TMK-ABC123');
  assert.deepEqual(body.recipient.address, {
    fullName: 'Funmi Davies', addressLine1: 'Flat 4, 27 Harehills Lane', city: 'Leeds', county: 'West Yorkshire', postcode: 'LS7 1SW', countryCode: 'GBR',
  });
  assert.equal(body.recipient.emailAddress, 'funmi@example.com');
  assert.deepEqual(body.packages[0].contents.map((item) => [item.quantity, item.unitValue, item.unitWeightInGrams]), [[2, 12, 400], [1, 10, 500]]);
  assert.equal(body.packages[0].weightInGrams, 1300);
  assert.equal(body.packages[0].packageFormatIdentifier, 'smallParcel');
  assert.deepEqual([body.subtotal, body.shippingCostCharged, body.total, body.currencyCode], [24, 3.99, 27.99, 'GBP']);
  assert.equal(body.postageDetails.serviceCode, 'TPS48');
  assert.equal(body.postageDetails.sendNotificationsTo, 'recipient');
  assert.equal(buildRoyalMailOrder(order, null, grams, 'smallParcel', 0.5).postageDetails.serviceCode, undefined);
});

// ---------- Sending ----------

test('a new order goes to Click & Drop on Tracked 48, once', async () => {
  const { sendOrderToRoyalMail, state, calls } = setup();
  const { order, error } = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.equal(error, undefined);
  assert.deepEqual(calls(), ['services', 'create']);
  assert.deepEqual(state.calls[0][1], { postcode: 'ls7 1sw', grams: 800 });
  const saved = state.orders['ord-1'];
  assert.equal(saved.royal_mail.status, 'sent');
  assert.equal(saved.royal_mail.orderIdentifier, 1001);
  assert.equal(saved.royal_mail.serviceName, 'Royal Mail Tracked 48');
  assert.equal(saved.status, 'unshipped', 'it ships when the label is printed');
  assert.equal(order.royal_mail.status, 'sent');
  // Claimed before Royal Mail was asked anything.
  assert.equal(state.writes[0].update.royal_mail.status, 'sending');

  await sendOrderToRoyalMail('ord-1', 'auto');
  await sendOrderToRoyalMail('ord-1', 'manual');
  assert.deepEqual(calls(), ['services', 'create']);
});

test('express orders go on Tracked 24, and a chosen service is used as it is', async () => {
  const express = ukOrder({ shipping_address: { ...ukOrder().shipping_address, shippingMethod: 'express' } });
  const auto = setup({ orders: [express] });
  await auto.sendOrderToRoyalMail('ord-1', 'auto');
  assert.equal(auto.state.calls.find(([name]) => name === 'create')[1].postageDetails.serviceCode, 'TPN24');

  const chosen = setup({ settings: { ...SETTINGS, standardService: 'SD1', standardServiceName: 'Special Delivery' } });
  await chosen.sendOrderToRoyalMail('ord-1', 'auto');
  assert.deepEqual(chosen.calls(), ['create'], 'no need to list services');
  assert.equal(chosen.state.orders['ord-1'].royal_mail.serviceName, 'Special Delivery');
});

test('no Tracked service on the account: sent anyway, with a note to choose one', async () => {
  const { sendOrderToRoyalMail, state } = setup({ client: { listRoyalMailServices: async () => [{ code: 'CRL48', name: '2nd Class' }] } });
  const { error } = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.match(error, /Choose Royal Mail Tracked 48 for it in Click & Drop/);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'sent');
  assert.equal(state.orders['ord-1'].royal_mail.serviceCode, undefined);
});

test('a service Royal Mail turns down: the order still goes in, without it', async () => {
  const { sendOrderToRoyalMail, state, calls } = setup({
    client: {
      createRoyalMailOrder: async (body) => {
        state.calls.push(['create', body]);
        if (body.postageDetails.serviceCode) throw new RoyalMailRefusal('Service not available for this package.');
        state.clickAndDrop.push({ orderIdentifier: 2002, orderReference: body.orderReference });
        return { orderIdentifier: 2002 };
      },
    },
  });
  const { error } = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.deepEqual(calls(), ['services', 'create', 'create']);
  assert.match(error, /wouldn't take Royal Mail Tracked 48.*Service not available/);
  assert.equal(state.orders['ord-1'].royal_mail.orderIdentifier, 2002);
});

test('a refusal (bad address) creates nothing and can be sent again from the order', async () => {
  let refuse = true;
  const { sendOrderToRoyalMail, state, calls } = setup({
    settings: { ...SETTINGS, standardService: 'TPS48' },
    client: {
      createRoyalMailOrder: async (body) => {
        state.calls.push(['create', body]);
        if (refuse) throw new RoyalMailRefusal('Postcode is invalid.');
        return { orderIdentifier: 3003 };
      },
    },
  });
  const first = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.match(first.error, /Postcode is invalid/);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'failed');

  // Automatic sending doesn't keep retrying; the admin's button does.
  await sendOrderToRoyalMail('ord-1', 'auto');
  assert.equal(calls().length, 2, 'the chosen service and then without it');
  refuse = false;
  await sendOrderToRoyalMail('ord-1', 'manual');
  assert.equal(state.orders['ord-1'].royal_mail.status, 'sent');
  assert.equal(state.orders['ord-1'].royal_mail.orderIdentifier, 3003);
});

test('a timeout is not sent again until Click & Drop has been checked for it', async () => {
  const { sendOrderToRoyalMail, state, calls } = setup({
    client: {
      createRoyalMailOrder: async (body) => {
        state.calls.push(['create', body]);
        // It reached Click & Drop, but the answer never came back.
        state.clickAndDrop.push({ orderIdentifier: 4004, orderReference: body.orderReference });
        throw new Error('The operation was aborted due to timeout');
      },
    },
  });
  const first = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.match(first.error, /didn't confirm/);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'sending');

  assert.match((await sendOrderToRoyalMail('ord-1', 'manual')).error, /being sent to Click & Drop right now/);

  // Five minutes on, sending again finds it there instead of creating it twice.
  const later = () => new Date(Date.now() + 6 * 60 * 1000);
  const again = await sendOrderToRoyalMail('ord-1', 'manual', later);
  assert.equal(again.error, undefined);
  assert.deepEqual(calls(), ['services', 'create', 'get']);
  assert.deepEqual(state.calls.at(-1)[1], ['TMK-ABC123']);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'sent');
  assert.equal(state.orders['ord-1'].royal_mail.orderIdentifier, 4004);
});

test('orders going abroad are left to create by hand', async () => {
  const abroad = ukOrder({ shipping_address: { ...ukOrder().shipping_address, country: 'Nigeria', postalCode: '100001' } });
  const { sendOrderToRoyalMail, state, calls } = setup({ orders: [abroad] });
  const { error } = await sendOrderToRoyalMail('ord-1', 'auto');
  assert.match(error, /customs/);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'skipped');
  assert.deepEqual(calls(), []);
});

test('orders that already have a tracking number, or are shipped, are not sent', async () => {
  const { sendOrderToRoyalMail, calls } = setup({ orders: [ukOrder({ tracking_number: 'MZ1' }), ukOrder({ id: 'ord-2', status: 'shipped' })] });
  assert.match((await sendOrderToRoyalMail('ord-1', 'manual')).error, /already has a tracking number/);
  assert.match((await sendOrderToRoyalMail('ord-2', 'manual')).error, /already has a tracking number/);
  assert.deepEqual(calls(), []);
});

test('automatic sending can be switched off', async () => {
  const off = setup({ settings: { ...SETTINGS, autoSend: false } });
  await off.autoSendToRoyalMail(ukOrder());
  assert.deepEqual(off.calls(), []);
  const on = setup();
  await on.autoSendToRoyalMail(ukOrder());
  assert.deepEqual(on.calls(), ['services', 'create']);
});

test('the daily check sends recent orders that were never tried', async () => {
  const { sweepRoyalMailSends, state } = setup({
    orders: [ukOrder(), ukOrder({ id: 'ord-old', created_at: '2026-10-01T00:00:00.000Z' }), ukOrder({ id: 'ord-failed', royal_mail: { status: 'failed', startedAt: '2026-11-09T18:00:00.000Z', updatedAt: '2026-11-09T18:00:00.000Z' } })],
  });
  assert.deepEqual(await sweepRoyalMailSends(Date.parse('2026-11-10T12:00:00Z')), { tried: 1, sent: 1 });
  assert.equal(state.orders['ord-1'].royal_mail.status, 'sent');
  assert.equal(state.orders['ord-old'].royal_mail, null);
  assert.equal(state.orders['ord-failed'].royal_mail.status, 'failed');
});

// ---------- Tracking numbers back ----------

const inClickAndDrop = (overrides = {}) => ukOrder({ royal_mail: { status: 'sent', startedAt: '2026-11-09T18:00:00.000Z', updatedAt: '2026-11-09T18:00:00.000Z', orderIdentifier: 1001 }, ...overrides });

test('once the label is printed the order ships with its tracking number, and the customer is emailed once', async () => {
  const { syncRoyalMailTracking, notifyShipped, state, calls } = setup({ orders: [inClickAndDrop(), inClickAndDrop({ id: 'ord-2', tracking_id: 'TMK-2', royal_mail: { status: 'sent', startedAt: 'x', updatedAt: 'x', orderIdentifier: 1002 } })] });
  state.clickAndDrop.push({ orderIdentifier: 1001, trackingNumber: 'mz584625660gb', printedOn: '2026-11-10T09:00:00Z' }, { orderIdentifier: 1002 });

  const orders = Object.values(state.orders);
  const { orders: after, shipped } = await syncRoyalMailTracking(orders);
  assert.deepEqual(calls(), ['get'], 'one request for every order waiting');
  assert.deepEqual(state.calls[0][1], [1001, 1002]);
  assert.deepEqual(shipped.map((order) => order.id), ['ord-1']);
  assert.equal(state.orders['ord-1'].status, 'shipped');
  assert.equal(state.orders['ord-1'].tracking_number, 'MZ584625660GB');
  assert.equal(state.orders['ord-1'].royal_mail.printedAt, '2026-11-10T09:00:00.000Z');
  assert.equal(state.orders['ord-2'].status, 'unshipped', 'no label yet');
  assert.equal(after.find((order) => order.id === 'ord-1').status, 'shipped');

  assert.equal(await notifyShipped(shipped[0]), true);
  assert.equal(await notifyShipped(shipped[0]), false, 'claimed: never twice');
  assert.deepEqual(state.emails, ['MZ584625660GB']);
  assert.ok(state.orders['ord-1'].shipped_email_sent_at);
});

test('a failed email is released for the next check', async () => {
  const shipped = ukOrder({ status: 'shipped', tracking_number: 'MZ1' });
  const { notifyShipped, state } = setup({ orders: [shipped], emailWorks: false });
  assert.equal(await notifyShipped(shipped), false);
  assert.equal(state.orders['ord-1'].shipped_email_sent_at, null);
});

test('nothing waiting, nothing asked', async () => {
  const { syncRoyalMailTracking, calls } = setup({ orders: [ukOrder(), ukOrder({ id: 'ord-2', status: 'shipped', tracking_number: 'MZ1' })] });
  await syncRoyalMailTracking([ukOrder(), ukOrder({ id: 'ord-2', status: 'shipped', tracking_number: 'MZ1' })]);
  assert.deepEqual(calls(), []);
});

test('the order button reports no label yet, and an order deleted in Click & Drop can be sent again', async () => {
  const { checkRoyalMailOrder, state } = setup({ orders: [inClickAndDrop()] });
  state.clickAndDrop.push({ orderIdentifier: 1001 });
  assert.match((await checkRoyalMailOrder('ord-1')).error, /No label yet/);

  state.clickAndDrop.length = 0;
  const gone = await checkRoyalMailOrder('ord-1');
  assert.match(gone.error, /no longer has this order/);
  assert.equal(state.orders['ord-1'].royal_mail.status, 'failed');
});

test('the daily check picks up labels and retries emails that failed', async () => {
  const { sweepRoyalMailTracking, state } = setup({
    orders: [inClickAndDrop(), ukOrder({ id: 'ord-2', status: 'shipped', tracking_number: 'MZ2' })],
  });
  state.clickAndDrop.push({ orderIdentifier: 1001, trackingNumber: 'MZ000000001GB' });
  const result = await sweepRoyalMailTracking(Date.parse('2026-11-10T12:00:00Z'));
  assert.deepEqual(result, { checked: 1, shipped: 1, emailed: 2 });
  assert.deepEqual(state.emails.sort(), ['MZ000000001GB', 'MZ2']);
});

// ---------- Talking to Royal Mail ----------

let requests;
let replies;
const savedEnv = { ...process.env };

beforeEach(() => {
  requests = [];
  replies = [];
  process.env.ROYAL_MAIL_API_KEY = 'key-123';
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    const reply = replies.shift() ?? { status: 200, body: [] };
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
  };
});

afterEach(() => {
  process.env = { ...savedEnv };
});

test('creating sends the API key and one order, and returns its Click & Drop number', async () => {
  const client = load('lib/server/royal-mail.ts');
  replies.push({ status: 200, body: { successCount: 1, createdOrders: [{ orderIdentifier: 77, orderReference: 'TMK-1' }] } });
  assert.equal((await client.createRoyalMailOrder({ orderReference: 'TMK-1' })).orderIdentifier, 77);
  assert.equal(requests[0].url, 'https://api.parcel.royalmail.com/api/v1/orders');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer key-123');
  assert.deepEqual(JSON.parse(requests[0].init.body), { items: [{ orderReference: 'TMK-1' }] });
});

test('Royal Mail saying no is a refusal with its reasons; Royal Mail breaking is not', async () => {
  const client = load('lib/server/royal-mail.ts');
  replies.push({ status: 200, body: { errorsCount: 1, failedOrders: [{ errors: [{ errorCode: 12, errorMessage: 'Postcode is invalid', fields: [{ fieldName: 'recipient.address.postcode' }] }] }] } });
  replies.push({ status: 503, body: {} });
  replies.push({ status: 401, body: {} });
  await assert.rejects(client.createRoyalMailOrder({}), (error) => error instanceof client.RoyalMailRefusal && error.message === 'Postcode is invalid (recipient.address.postcode)');
  await assert.rejects(client.createRoyalMailOrder({}), (error) => !(error instanceof client.RoyalMailRefusal) && /HTTP 503/.test(error.message));
  await assert.rejects(client.createRoyalMailOrder({}), /refused the API key/);
});

test('orders are looked up by Click & Drop number or by our quoted order number', async () => {
  const client = load('lib/server/royal-mail.ts');
  replies.push({ status: 200, body: [{ orderIdentifier: 1, trackingNumber: 'MZ1' }] });
  replies.push({ status: 404, body: {} });
  assert.equal((await client.getRoyalMailOrders([1, 'TMK-A;B']))[0].trackingNumber, 'MZ1');
  assert.equal(requests[0].url, 'https://api.parcel.royalmail.com/api/v1/orders/1;"TMK-A%3BB"');
  assert.deepEqual(await client.getRoyalMailOrders(['TMK-NONE']), []);
});

test("services come from the account's list, or the pay-as-you-go list with prices", async () => {
  const client = load('lib/server/royal-mail.ts');
  replies.push({ status: 200, body: [{ carrierGuid: 'c', shippingAccountName: 'Main', services: [{ serviceCode: 'TPS48', serviceName: 'Royal Mail Tracked 48' }] }] });
  assert.deepEqual(await client.listRoyalMailServices({ postcode: 'LS7 1SW', grams: 800 }), [{ code: 'TPS48', name: 'Royal Mail Tracked 48' }]);
  assert.match(requests[0].url, /\/services\?destinationCountryCode=GBR&destinationPostcode=LS7\+1SW&packageWeight=800$/);

  replies.push({ status: 200, body: [] });
  replies.push({ status: 200, body: { services: [{ serviceCode: 'TOLP48', serviceName: 'Tracked 48', cost: 3.0, vatCost: 0.6 }] } });
  assert.deepEqual(await client.listRoyalMailServices(), [{ code: 'TOLP48', name: 'Tracked 48', price: 3.6 }]);
  assert.match(requests.at(-1).url, /\/services\/olp\?country=GBR$/);
});

// ---------- The email ----------

test('the shipped email links the Royal Mail tracking page and escapes the customer details', () => {
  const { buildShippedEmail } = load('lib/server/shipped-email.ts', { './email-sender': { sendEmail: async () => ({ error: null }) } });
  const email = buildShippedEmail(ukOrder({ status: 'shipped', customer_name: '<b>Funmi</b> D', tracking_number: 'MZ584625660GB', royal_mail: { serviceName: 'Royal Mail Tracked 48' } }), 'https://toymakfashion.com');
  assert.equal(email.to, 'funmi@example.com');
  assert.match(email.subject, /TMK-ABC123 has shipped/);
  assert.match(email.html, /&lt;b&gt;Funmi&lt;\/b&gt;/);
  assert.match(email.html, /royalmail\.com\/track-your-item#\/tracking-results\/MZ584625660GB/);
  assert.match(email.html, /Royal Mail Tracked 48/);
  assert.match(email.html, /track-order\?email=funmi%40example\.com&amp;order=TMK-ABC123|track-order\?email=funmi%40example\.com&order=TMK-ABC123/);
});
