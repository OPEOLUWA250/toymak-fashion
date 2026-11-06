const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { load } = require('./helpers.cjs');

const originalEnv = process.env.NODE_ENV;
const order = { tracking_id: 'TMK-ABC123', total_amount: 45.5, currency: 'GBP', items: [{ product_id: 'prod-1', quantity: 2 }] };
const product = { id: 'prod-1', name: 'Waist Trainer', price_gbp: 20 };

let storage;
let calls;
let pixel;
let appendedScripts;

function visit(url) {
  const { pathname, search, hostname } = new URL(url, 'https://toymakfashion.com');
  globalThis.window = { location: { pathname, search, hostname }, fbq: undefined };
}

function events() {
  return window.fbq.queue.filter(([method]) => method === 'track').map(([, name, data, options]) => ({ name, data, options }));
}

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  storage = new Map();
  appendedScripts = [];
  calls = [];
  globalThis.localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, value),
  };
  globalThis.document = {
    cookie: '',
    createElement: () => ({}),
    head: { appendChild: (script) => appendedScripts.push(script) },
  };
  visit('/shop');
  pixel = load('lib/meta-pixel.ts');
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
});

const accept = () => storage.set('toymak-cookie-consent', 'granted');

test('addresses that can hold private details are never reported to Meta', () => {
  for (const [path, search] of [
    ['/admin', ''],
    ['/admin/login', ''],
    ['/track-order', '?email=a%40b.com&order=TMK-1'],
    ['/unsubscribe', '?token=abc'],
    ['/checkout/success', '?gateway=stripe&session_id=cs_live_123'],
    ['/checkout/success', '?gateway=paystack&reference=abc'],
    ['/cart', '?restore=abc'],
  ]) {
    assert.equal(pixel.isPrivateUrl(path, search), true, path + search);
  }
  for (const [path, search] of [
    ['/', ''],
    ['/shop', '?category=bra'],
    ['/cart', ''],
    ['/checkout', ''],
    ['/checkout/success', ''],
    ['/product/waist-trainer-prod-1', ''],
    ['/administrator-guide', ''],
  ]) {
    assert.equal(pixel.isPrivateUrl(path, search), false, path + search);
  }
});

for (const [label, choose] of [
  ['before a choice is made', () => {}],
  ['after declining', () => storage.set('toymak-cookie-consent', 'denied')],
]) {
  test(`nothing loads or sends ${label}`, () => {
    choose();
    pixel.trackPageView();
    pixel.trackViewContent(product);
    assert.equal(window.fbq, undefined);
    assert.equal(appendedScripts.length, 0);
  });
}

test('accepting loads the pixel once, set up without its automatic tracking', () => {
  accept();
  pixel.trackPageView();
  pixel.trackPageView();
  assert.equal(appendedScripts.length, 1);
  assert.equal(window.fbq.disablePushState, true);
  assert.equal(window.fbq.allowDuplicatePageViews, true);
  assert.deepEqual(window.fbq.queue.slice(0, 2), [
    ['set', 'autoConfig', false, '1641239721033624'],
    ['init', '1641239721033624'],
  ]);
  assert.equal(events().length, 2);
});

test('development builds and private addresses send nothing, even with consent', () => {
  accept();
  process.env.NODE_ENV = 'development';
  pixel.trackPageView();
  assert.equal(window.fbq, undefined);

  process.env.NODE_ENV = 'production';
  visit('/track-order?email=a%40b.com');
  pixel.trackPageView();
  assert.equal(window.fbq, undefined);
});

test('shopping events carry the value and currency Meta needs', () => {
  accept();
  pixel.trackViewContent(product);
  pixel.trackAddToCart(product, 3);
  pixel.trackInitiateCheckout([{ product_id: 'prod-1', quantity: 3 }], 15000, 'NGN');
  const [view, add, checkout] = events();
  assert.equal(view.name, 'ViewContent');
  assert.deepEqual([view.data.value, view.data.currency], [20, 'GBP']);
  assert.equal(add.name, 'AddToCart');
  assert.deepEqual([add.data.value, add.data.currency], [60, 'GBP']);
  assert.equal(checkout.name, 'InitiateCheckout');
  assert.deepEqual([checkout.data.value, checkout.data.currency, checkout.data.num_items], [15000, 'NGN', 3]);
});

test('a purchase counts once across refreshes and never carries the payment id', () => {
  accept();
  visit('/checkout/success');
  pixel.trackPurchaseOnce(order);
  const [purchase] = events();
  assert.equal(purchase.name, 'Purchase');
  assert.deepEqual([purchase.data.value, purchase.data.currency], [45.5, 'GBP']);
  assert.equal(purchase.options.eventID, 'purchase-TMK-ABC123');

  visit('/checkout/success');
  pixel = load('lib/meta-pixel.ts');
  pixel.trackPurchaseOnce(order);
  assert.equal(window.fbq, undefined);
});

test('a purchase blocked by missing consent or a private address can still count later', () => {
  visit('/checkout/success');
  pixel.trackPurchaseOnce(order);
  assert.equal(window.fbq, undefined);

  accept();
  visit('/checkout/success?gateway=stripe&session_id=cs_live_123');
  pixel.trackPurchaseOnce(order);
  assert.equal(window.fbq, undefined);

  visit('/checkout/success');
  pixel.trackPurchaseOnce(order);
  assert.equal(events().length, 1);
});

test('withdrawing consent revokes the pixel, clears its cookies, and accepting again resumes it', () => {
  accept();
  pixel.trackPageView();
  const cookieWrites = [];
  Object.defineProperty(document, 'cookie', { set: (value) => cookieWrites.push(value) });

  storage.set('toymak-cookie-consent', 'denied');
  pixel.stopMetaPixel();
  assert.deepEqual(window.fbq.queue.at(-1), ['consent', 'revoke']);
  assert.ok(cookieWrites.some((c) => c.startsWith('_fbp=;') && c.includes('domain=.toymakfashion.com')));
  assert.ok(cookieWrites.some((c) => c.startsWith('_fbc=;')));

  const before = window.fbq.queue.length;
  pixel.trackPageView();
  assert.equal(window.fbq.queue.length, before);

  accept();
  pixel.trackPageView();
  assert.deepEqual(window.fbq.queue.at(-2), ['consent', 'grant']);
  assert.equal(window.fbq.queue.at(-1)[1], 'PageView');
});
