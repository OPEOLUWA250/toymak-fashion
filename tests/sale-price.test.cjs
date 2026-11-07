const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { applySale, regularPrices, salePercent, compareAtFor, isOnSale, priceParts } = load('lib/sale-price.ts');
const { calculateOrderTotals } = load('lib/pricing.ts');

const regular = { gbp: 17, ngn: 34000, usd: 21.5 };

test('the percentage matches the reference: £17 down to £15 is -12%', () => {
  assert.equal(salePercent(17, 15), 12);
  assert.equal(salePercent(100, 99.9), 1, 'a real reduction never shows as 0%');
  assert.equal(salePercent(17, 17), 0);
  assert.equal(salePercent(0, 0), 0);
});

test('a sale lowers every currency by the same percentage and keeps the regular £ price', () => {
  const p = applySale(regular, 15);
  assert.equal(p.price_gbp, 15);
  assert.equal(p.compare_at_price_gbp, 17);
  assert.equal(p.price_ngn, Math.round(34000 * 15 / 17));
  assert.equal(p.price_usd, Math.round(21.5 * 15 / 17 * 100) / 100);
  assert.ok(isOnSale(p));
});

test('no sale price, or one that is not lower, means regular prices', () => {
  for (const sale of [null, 17, 20, 0, -5, NaN]) {
    const p = applySale(regular, sale);
    assert.deepEqual([p.price_gbp, p.price_ngn, p.price_usd, p.compare_at_price_gbp], [17, 34000, 21.5, undefined], String(sale));
    assert.equal(isOnSale(p), false);
  }
});

test('editing a product on sale gets its regular prices back', () => {
  const back = regularPrices(applySale(regular, 15));
  assert.equal(back.gbp, 17);
  assert.ok(Math.abs(back.ngn - 34000) <= 1, `₦${back.ngn}`);
  assert.ok(Math.abs(back.usd - 21.5) <= 0.01, `$${back.usd}`);
  assert.deepEqual(regularPrices({ price_gbp: 17, price_ngn: 34000, price_usd: 21.5 }), regular);
});

test('ending a sale restores the regular prices', () => {
  const onSale = applySale(regular, 15);
  const ended = applySale(regularPrices(onSale), null);
  assert.equal(ended.price_gbp, 17);
  assert.equal(ended.compare_at_price_gbp, undefined);
});

test('the crossed-out price follows the currency on show', () => {
  const p = applySale(regular, 15);
  assert.equal(compareAtFor(p, 15), 17);
  assert.ok(Math.abs(compareAtFor(p, p.price_ngn) - 34000) < 2);
  assert.equal(compareAtFor({ price_gbp: 17 }, 17), undefined);
});

test('checkout charges the sale price', () => {
  const product = { id: 'p', name: 'Lotion', ...applySale(regular, 15), stock_qty: 5, sizes: [], colors: [], status: 'active' };
  const settings = { shippingThreshold: { GBP: 100, NGN: 100000, USD: 100 }, shippingCost: { GBP: 3.99, NGN: 2000, USD: 5 }, expressShippingGBP: 8.49, tax: { GBP: 0, NGN: 0, USD: 0 } };
  assert.equal(calculateOrderTotals([{ product_id: 'p', quantity: 2 }], 'GBP', [product], settings).subtotal, 30);
});

test('prices split into pounds and pence for the large display', () => {
  assert.deepEqual(priceParts(15, 'GBP'), { symbol: '£', whole: '15', fraction: '00' });
  assert.deepEqual(priceParts(1234.5, 'NGN'), { symbol: '₦', whole: '1,234', fraction: '50' });
});
