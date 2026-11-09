const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

const realParcel2Go = load('lib/server/parcel2go.ts');
const { Parcel2GoRefusal } = realParcel2Go;

const SETTINGS = {
  autoBook: true,
  autoBookSince: '2026-11-01T00:00:00.000Z',
  payWithPrepay: true,
  maxPriceGBP: 15,
  standardService: 'evri-48',
  standardServiceName: 'Evri 48',
  expressService: 'rm-24',
  expressServiceName: 'Royal Mail 24',
  parcel: { weightKg: 0.5, lengthCm: 30, widthCm: 20, heightCm: 5 },
  sender: { name: 'Ada Okafor', company: 'Toymak Fashion', email: 'ship@toymak.test', phone: '07000000000', property: '1', street: 'High Street', town: 'Birmingham', county: '', postcode: 'B1 1AA' },
};

function ukOrder(overrides = {}) {
  return {
    id: 'ord-1',
    tracking_id: 'TMK-ABC123',
    status: 'unshipped',
    customer_name: 'Funmi Davies',
    customer_email: 'funmi@example.com',
    customer_phone: '07111111111',
    shipping_address: { fullName: 'Funmi Davies', email: '', phone: '', street: 'Flat 4, 27 Harehills Lane', city: 'Leeds', state: 'West Yorkshire', postalCode: 'ls7 1sw', country: 'United Kingdom', shippingMethod: 'standard' },
    items: [{ product_name: 'Waist Trainer', quantity: 2, size: 'M', color: 'Black' }],
    subtotal: 24,
    currency: 'GBP',
    parcel2go_reference: null,
    parcel2go_booking: null,
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
        in(column, values) { filters.push((row) => values.includes(read(row, column))); return builder; },
        gte(column, value) { filters.push((row) => String(read(row, column)) >= value); return builder; },
        not(column) { filters.push((row) => read(row, column) !== null); return builder; },
        async maybeSingle() { const rows = run(); return { data: rows[0] ? { id: rows[0].id } : null, error: null }; },
        async single() { const rows = run(); return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'no row' } }; },
        then(resolve, reject) { return Promise.resolve({ data: run(), error: null }).then(resolve, reject); },
      };
      return builder;
    },
  };
}

function setup({ settings = SETTINGS, orders = [ukOrder()], parcel2go = {} } = {}) {
  const state = {
    orders: Object.fromEntries(orders.map((order) => [order.id, structuredClone(order)])),
    settingsRow: { id: 'default', parcel2go_booking: structuredClone(settings) },
    writes: [],
    calls: [],
  };
  const p2g = {
    ...realParcel2Go,
    parcel2GoConfigured: () => true,
    quoteParcel2Go: async (request) => {
      state.calls.push(['quote', request]);
      return [{ TotalPrice: 3.5, Collection: '2026-11-10T09:00:00', Service: { Slug: request.service, Name: 'Svc', CourierName: 'Evri' } }];
    },
    createParcel2GoOrder: async (body) => {
      state.calls.push(['create', body]);
      return { OrderId: '76423942', Hash: 'h1', TotalPrice: 3.5, Links: { payment: 'https://www.parcel2go.com/order/payment?id=76423942' }, OrderlineIdMap: [{ OrderLineId: '115030194', ItemId: 'x' }] };
    },
    payParcel2GoWithPrepay: async (orderId, hash) => {
      state.calls.push(['pay', orderId, hash]);
      return { paid: true, documents: [{ name: 'labels-a4', url: 'https://www.parcel2go.com/labels/a4.pdf' }] };
    },
    ...parcel2go,
  };
  const module = load('lib/server/parcel2go-booking.ts', {
    './supabase': { getSupabaseAdmin: () => fakeSupabase(state) },
    './order-store': { getServerOrderById: async (id) => (state.orders[id] ? { ...structuredClone(state.orders[id]), created_at: new Date(state.orders[id].created_at) } : null) },
    './parcel2go': p2g,
  });
  return { ...module, state, calls: () => state.calls.map(([name]) => name) };
}

// ---------- The Parcel2Go client ----------

function fakeParcel2GoApi(replies) {
  const requests = [];
  process.env.PARCEL2GO_CLIENT_ID = 'client-id';
  process.env.PARCEL2GO_CLIENT_SECRET = 'client-secret';
  delete process.env.PARCEL2GO_BASE_URL;
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith('/auth/connect/token')) {
      const scope = new URLSearchParams(String(init.body)).get('scope');
      return { ok: true, status: 200, json: async () => ({ access_token: `token:${scope}`, expires_in: 7200 }) };
    }
    const reply = replies.shift();
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body };
  };
  return { client: load('lib/server/parcel2go.ts'), requests };
}

test('paying uses a token with the payment scope; quoting and creating do not', async () => {
  const { client, requests } = fakeParcel2GoApi([
    { status: 200, body: { Quotes: [{ TotalPrice: 3, Service: { Slug: 'evri-48' } }] } },
    { status: 200, body: { OrderId: '1', OrderlineIdMap: [{ OrderLineId: '2' }] } },
    { status: 200, body: { Links: [{ Name: 'labels-a4', Link: 'https://p2g.test/a4.pdf' }, { Name: 'help', Link: 'javascript:alert(1)' }] } },
  ]);
  await client.quoteParcel2Go({ service: 'evri-48', collection: { Country: 'GBR' }, delivery: { Country: 'GBR' }, parcel: { value: 1, weightKg: 1, lengthCm: 1, widthCm: 1, heightCm: 1 } });
  await client.createParcel2GoOrder({});
  const paid = await client.payParcel2GoWithPrepay('1', 'a+b/c=');
  assert.deepEqual(paid, { paid: true, documents: [{ name: 'labels-a4', url: 'https://p2g.test/a4.pdf' }] });
  const calls = requests.filter((r) => !r.url.endsWith('/auth/connect/token'));
  assert.deepEqual(calls.map((r) => r.init.headers.Authorization), ['Bearer token:public-api', 'Bearer token:public-api', 'Bearer token:public-api payment']);
  assert.match(calls[2].url, /\/api\/orders\/1\/paywithprepay\?hash=a%2Bb%2Fc%3D$/);
});

test('Parcel2Go saying no is a refusal; Parcel2Go breaking is not', async () => {
  const { client } = fakeParcel2GoApi([
    { status: 400, body: { Errors: [{ Error: 'Postcode is invalid.' }] } },
    { status: 503, body: {} },
    { status: 400, body: { Errors: [{ Name: 'Balance', Description: 'Insufficient funds.' }] } },
  ]);
  await assert.rejects(client.createParcel2GoOrder({}), (error) => error instanceof client.Parcel2GoRefusal && /Postcode is invalid/.test(error.message));
  await assert.rejects(client.createParcel2GoOrder({}), (error) => !(error instanceof client.Parcel2GoRefusal) && /HTTP 503/.test(error.message));
  assert.deepEqual(await client.payParcel2GoWithPrepay('1'), { paid: false, reason: 'Insufficient funds.' });
});

// ---------- Building the booking ----------

test('street lines split into house and street', () => {
  const { splitStreetLine } = setup();
  assert.deepEqual(splitStreetLine('12 Hagley Road'), { property: '12', street: 'Hagley Road' });
  assert.deepEqual(splitStreetLine('Flat 4, 27 Harehills Lane'), { property: 'Flat 4', street: '27 Harehills Lane' });
  assert.deepEqual(splitStreetLine('Rose Cottage'), { property: 'Rose Cottage', street: 'Rose Cottage' });
});

test('the Parcel2Go order carries both addresses, the parcel and our order number', () => {
  const { buildParcel2GoOrder } = setup();
  const body = buildParcel2GoOrder(ukOrder(), SETTINGS, 'evri-48', '2026-11-10T09:00:00', { item: 'item-id', parcel: 'parcel-id' });
  const item = body.Items[0];
  assert.equal(item.Service, 'evri-48');
  assert.equal(item.Reference, 'TMK-ABC123');
  assert.equal(item.CollectionAddress.Postcode, 'B1 1AA');
  const parcel = item.Parcels[0];
  assert.deepEqual([parcel.Weight, parcel.Length, parcel.Width, parcel.Height], [0.5, 30, 20, 5]);
  assert.equal(parcel.ContentsSummary, '2 x Waist Trainer');
  assert.deepEqual(
    [parcel.DeliveryAddress.ContactName, parcel.DeliveryAddress.Property, parcel.DeliveryAddress.Street, parcel.DeliveryAddress.Town, parcel.DeliveryAddress.Postcode, parcel.DeliveryAddress.CountryIsoCode],
    ['Funmi Davies', 'Flat 4', '27 Harehills Lane', 'Leeds', 'LS7 1SW', 'GBR'],
  );
  assert.deepEqual(body.CustomerDetails, { Email: 'ship@toymak.test', Forename: 'Ada', Surname: 'Okafor' });
});

test('express orders use the express service', () => {
  const { serviceForOrder } = setup();
  const express = ukOrder({ shipping_address: { ...ukOrder().shipping_address, shippingMethod: 'express' } });
  assert.equal(serviceForOrder(express, SETTINGS).slug, 'rm-24');
  // No express service chosen: picked automatically (a fast one) per order.
  assert.deepEqual(serviceForOrder(express, { ...SETTINGS, expressService: '' }), { slug: '', name: '', express: true });
});

// ---------- Booking ----------

test('a new order is quoted, created, paid, and gets its P2G number', async () => {
  const { bookOrderOnParcel2Go, state, calls } = setup();
  const { order, error } = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.equal(error, undefined);
  assert.deepEqual(calls(), ['quote', 'create', 'pay']);
  const saved = state.orders['ord-1'];
  assert.equal(saved.parcel2go_reference, 'P2G115030194');
  assert.equal(saved.parcel2go_booking.status, 'booked');
  assert.equal(saved.parcel2go_booking.price, 3.5);
  assert.deepEqual(saved.parcel2go_booking.documents, [{ name: 'labels-a4', url: 'https://www.parcel2go.com/labels/a4.pdf' }]);
  assert.equal(saved.status, 'unshipped', 'it ships when the courier scans it, not when booked');
  assert.equal(order.parcel2go_booking.status, 'booked');
  // The order was claimed before Parcel2Go was asked anything.
  assert.equal(state.writes[0].update.parcel2go_booking.status, 'booking');
});

test('the same order is never booked twice', async () => {
  const { bookOrderOnParcel2Go, calls } = setup();
  await bookOrderOnParcel2Go('ord-1', 'auto');
  await bookOrderOnParcel2Go('ord-1', 'auto');
  await bookOrderOnParcel2Go('ord-1', 'manual');
  assert.deepEqual(calls(), ['quote', 'create', 'pay']);
});

test('a booking dearer than the limit waits to be paid, and the button pays it', async () => {
  const { bookOrderOnParcel2Go, state, calls } = setup({ settings: { ...SETTINGS, maxPriceGBP: 3 } });
  const { error } = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.match(error, /above your £3\.00 limit/);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'awaiting_payment');
  assert.equal(state.orders['ord-1'].parcel2go_reference, 'P2G115030194');
  assert.deepEqual(calls(), ['quote', 'create']);

  await bookOrderOnParcel2Go('ord-1', 'manual');
  assert.deepEqual(calls(), ['quote', 'create', 'pay']);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'booked');
});

test('not enough prepay leaves the booking unpaid with the reason', async () => {
  const { bookOrderOnParcel2Go, state } = setup({ parcel2go: { payParcel2GoWithPrepay: async () => ({ paid: false, reason: 'Insufficient prepay balance.' }) } });
  const { error } = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.match(error, /Insufficient prepay balance/);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'awaiting_payment');
  assert.ok(state.orders['ord-1'].parcel2go_booking.payUrl);
});

test('a refusal books nothing and can be tried again from the order', async () => {
  let refuse = true;
  const { bookOrderOnParcel2Go, state, calls } = setup({
    parcel2go: {
      quoteParcel2Go: async (request) => {
        state.calls.push(['quote']);
        if (refuse) throw new Parcel2GoRefusal('Postcode not recognised.');
        return [{ TotalPrice: 3.5, Service: { Slug: request.service, Name: 'Svc', CourierName: 'Evri' } }];
      },
    },
  });
  const first = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.match(first.error, /Postcode not recognised/);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'failed');
  assert.equal(state.orders['ord-1'].parcel2go_reference, null);

  // Automatic booking doesn't keep retrying; the admin's button does.
  await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.deepEqual(calls(), ['quote']);
  refuse = false;
  await bookOrderOnParcel2Go('ord-1', 'manual');
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'booked');
});

test('a timeout while creating is not retried until someone has checked', async () => {
  const { bookOrderOnParcel2Go, state, calls } = setup({
    parcel2go: { createParcel2GoOrder: async () => { state.calls.push(['create']); throw new Error('The operation timed out.'); } },
  });
  const first = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.match(first.error, /Check your Parcel2Go account/);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'booking');

  const again = await bookOrderOnParcel2Go('ord-1', 'manual');
  assert.match(again.error, /being booked right now/);
  assert.deepEqual(calls(), ['quote', 'create']);

  // Five minutes on, the admin may book again (after checking Parcel2Go).
  const later = () => new Date(Date.now() + 6 * 60 * 1000);
  await bookOrderOnParcel2Go('ord-1', 'manual', later);
  assert.deepEqual(calls(), ['quote', 'create', 'quote', 'create']);
});

test('orders going abroad are left to book by hand', async () => {
  const abroad = ukOrder({ shipping_address: { ...ukOrder().shipping_address, country: 'Nigeria', postalCode: '100001' } });
  const { bookOrderOnParcel2Go, state, calls } = setup({ orders: [abroad] });
  const { error } = await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.match(error, /customs/);
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'skipped');
  assert.deepEqual(calls(), []);
});

test('orders that already have a number, or are shipped, are not booked', async () => {
  const { bookOrderOnParcel2Go, calls } = setup({ orders: [ukOrder({ parcel2go_reference: 'P2G999' }), ukOrder({ id: 'ord-2', status: 'shipped' })] });
  assert.match((await bookOrderOnParcel2Go('ord-1', 'manual')).error, /already has/);
  assert.match((await bookOrderOnParcel2Go('ord-2', 'manual')).error, /already has/);
  assert.deepEqual(calls(), []);
});

// ---------- Automatic booking ----------

test('automatic booking only runs when switched on, and only for orders since then', async () => {
  const off = setup({ settings: { ...SETTINGS, autoBook: false } });
  await off.autoBookParcel2Go({ ...ukOrder(), created_at: new Date('2026-11-09T18:00:00Z') });
  assert.deepEqual(off.calls(), []);

  const before = setup({ settings: { ...SETTINGS, autoBookSince: '2026-11-10T00:00:00.000Z' } });
  await before.autoBookParcel2Go({ ...ukOrder(), created_at: new Date('2026-11-09T18:00:00Z') });
  assert.deepEqual(before.calls(), []);

  const on = setup();
  await on.autoBookParcel2Go({ ...ukOrder(), created_at: new Date('2026-11-09T18:00:00Z') });
  assert.deepEqual(on.calls(), ['quote', 'create', 'pay']);
});

test('the daily check books recent orders that were never tried', async () => {
  const { sweepParcel2GoBookings, state } = setup({
    orders: [ukOrder(), ukOrder({ id: 'ord-old', created_at: '2026-10-01T00:00:00.000Z' }), ukOrder({ id: 'ord-failed', parcel2go_booking: { status: 'failed', startedAt: '2026-11-09T18:00:00.000Z', updatedAt: '2026-11-09T18:00:00.000Z' } })],
  });
  const result = await sweepParcel2GoBookings(Date.parse('2026-11-10T12:00:00Z'));
  assert.deepEqual(result, { tried: 1, booked: 1 });
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'booked');
  assert.equal(state.orders['ord-old'].parcel2go_booking, null);
  assert.equal(state.orders['ord-failed'].parcel2go_booking.status, 'failed');
});

// ---------- Settings ----------

test('automatic booking needs only the sender details, not a courier', async () => {
  const { saveParcel2GoBookingSettings } = setup({ settings: {} });
  await assert.rejects(saveParcel2GoBookingSettings({ ...SETTINGS, sender: { ...SETTINGS.sender, name: '' } }), /Add your name/);
  await assert.rejects(saveParcel2GoBookingSettings({ ...SETTINGS, sender: { ...SETTINGS.sender, postcode: '' } }), /address, town and postcode/);
  const saved = await saveParcel2GoBookingSettings({ ...SETTINGS, standardService: '', expressService: '', sender: { ...SETTINGS.sender, property: '' } });
  assert.equal(saved.autoBook, true);
});

// ---------- Choosing a courier automatically ----------

const quote = (slug, price, extra = {}) => ({
  TotalPrice: price,
  Service: { Slug: slug, Name: slug, CourierName: 'C', CollectionType: 'Shop', DeliveryType: 'Door', Classification: 'Medium', IsPrinterRequired: false, ...extra },
});

test('automatic picks the cheapest drop-off-to-door service, and a fast one for express', () => {
  const { pickQuote } = setup();
  const quotes = [
    quote('shop-to-shop', 2.34, { DeliveryType: 'Shop' }),
    quote('needs-printer', 2.5, { IsPrinterRequired: true }),
    quote('collected', 2.6, { CollectionType: 'Collection' }),
    quote('evri', 2.71),
    quote('inpost', 2.64),
    quote('evri-next-day', 3.82, { Classification: 'Fast' }),
    quote('rm-24', 4.8, { Classification: 'Fast' }),
  ];
  assert.equal(pickQuote(quotes, '', false).Service.Slug, 'inpost');
  assert.equal(pickQuote(quotes, '', true).Service.Slug, 'evri-next-day');
  assert.equal(pickQuote(quotes, 'rm-24', false).Service.Slug, 'rm-24');
  assert.equal(pickQuote(quotes, 'gone', false), undefined);
  // No fast service: express still gets booked on the cheapest one.
  assert.equal(pickQuote(quotes.filter((q) => q.Service.Classification !== 'Fast'), '', true).Service.Slug, 'inpost');
});

test('with no courier chosen, the booking uses the automatic pick and records its name', async () => {
  const { bookOrderOnParcel2Go, state } = setup({
    settings: { ...SETTINGS, standardService: '', standardServiceName: '', sender: { ...SETTINGS.sender, property: '', street: '10 Broad Street' } },
    parcel2go: {
      quoteParcel2Go: async (request) => {
        state.calls.push(['quote', request]);
        return [quote('evri', 2.71, { Name: 'Evri ParcelShop', CourierName: 'Evri' }), quote('inpost', 2.64, { Name: 'Shop to Home', CourierName: 'InPost' })];
      },
    },
  });
  await bookOrderOnParcel2Go('ord-1', 'auto');
  assert.equal(state.calls[0][1].service, undefined, 'quotes every service');
  const created = state.calls.find(([name]) => name === 'create')[1].Items[0];
  assert.equal(created.Service, 'inpost');
  assert.deepEqual([created.CollectionAddress.Property, created.CollectionAddress.Street], ['10', 'Broad Street']);
  assert.equal(state.orders['ord-1'].parcel2go_booking.serviceName, 'InPost Shop to Home');
  assert.equal(state.orders['ord-1'].parcel2go_booking.status, 'booked');
});

test('switching automatic booking on starts the clock, and saving again keeps it', async () => {
  const { saveParcel2GoBookingSettings, state } = setup({ settings: { ...SETTINGS, autoBook: false, autoBookSince: null } });
  const first = await saveParcel2GoBookingSettings({ ...SETTINGS, autoBookSince: '2020-01-01T00:00:00.000Z' }, new Date('2026-11-10T08:00:00Z'));
  assert.equal(first.autoBookSince, '2026-11-10T08:00:00.000Z');
  const second = await saveParcel2GoBookingSettings({ ...SETTINGS, maxPriceGBP: 20 }, new Date('2026-11-12T08:00:00Z'));
  assert.equal(second.autoBookSince, '2026-11-10T08:00:00.000Z');
  assert.equal(state.settingsRow.parcel2go_booking.maxPriceGBP, 20);
  const off = await saveParcel2GoBookingSettings({ ...SETTINGS, autoBook: false });
  assert.equal(off.autoBookSince, null);
});

// ---------- Tracking a booked order ----------

test('a booked order turns shipped once the courier scans it', async () => {
  const writes = [];
  const query = () => {
    const builder = {
      update(values) { writes.push(values); return builder; },
      eq() { return builder; },
      select() { return builder; },
      async maybeSingle() { return { data: { id: 'ord-1' }, error: null }; },
    };
    return builder;
  };
  let stage = 'awaiting';
  const { refreshOrderDelivery } = load('lib/server/delivery-tracking.ts', {
    './supabase': { getSupabaseAdmin: () => ({ from: query }) },
    './order-store': { getServerOrderById: async () => null },
    './parcel2go': { ...realParcel2Go, parcel2GoConfigured: () => true, fetchParcel2GoTracking: async () => ({ stage, stageAt: null, estimatedDelivery: null, latestEvent: stage, latestEventAt: null, problem: false, updatedAt: 'now' }) },
    './delivery-email': { sendDeliveryEmail: async () => true },
  });
  const booked = ukOrder({ parcel2go_reference: 'P2G115030194', parcel2go_booking: { status: 'booked' }, delivery: null });

  const waiting = await refreshOrderDelivery(booked);
  assert.equal(waiting.status, 'unshipped');

  stage = 'dropped_off';
  const scanned = await refreshOrderDelivery(waiting);
  assert.equal(scanned.status, 'shipped');
  assert.equal(writes.at(-1).status, 'shipped');

  // An unshipped order with no booking isn't followed at all.
  const plain = ukOrder({ parcel2go_reference: 'P2G1', parcel2go_booking: null });
  assert.equal(await refreshOrderDelivery(plain), plain);
});
