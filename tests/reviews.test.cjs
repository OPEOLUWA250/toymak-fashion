const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

const response = { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } };

class DuplicateReviewError extends Error {}

const order = {
  id: 'ord-1',
  tracking_id: 'TMK-AB12CD',
  customer_email: 'amaka@example.com',
  shipping_address: { country: 'United Kingdom' },
  items: [{ product_id: 'prod-1', color: 'Black', size: 'L' }],
};

function route({ orders = [order], create } = {}) {
  const calls = [];
  const { parseGuestCredentials } = load('lib/server/guest-orders.ts', { './order-store': {} });
  const { POST } = load('app/api/reviews/route.ts', {
    'next/server': response,
    '@/lib/server/reviews': {
      DuplicateReviewError,
      createReview: async (input) => {
        calls.push(input);
        if (create) return create(input);
        return { verified: Boolean(input.orderId) };
      },
    },
    '@/lib/server/guest-orders': {
      parseGuestCredentials,
      findGuestOrders: async (email, number) => orders.filter((o) => o.customer_email === email && o.tracking_id === number),
    },
  });
  return { calls, post: (body) => POST({ json: async () => body }) };
}

const base = { customerName: 'Amaka O.', rating: 5, comment: 'Lovely fit and quick delivery' };

test('a shop review without order details is saved unverified for moderation', async () => {
  const { calls, post } = route();
  const result = await post(base);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { received: true, verified: false });
  assert.deepEqual(calls[0], { customerName: 'Amaka O.', rating: 5, comment: 'Lovely fit and quick delivery', location: null, orderId: null });
});

test('a matching order verifies the review and records the delivery country', async () => {
  const { calls, post } = route();
  const result = await post({ ...base, orderEmail: 'amaka@example.com', orderNumber: 'ab12cd' });
  assert.equal(result.status, 200);
  assert.equal(result.data.verified, true);
  assert.equal(calls[0].orderId, 'ord-1');
  assert.equal(calls[0].location, 'United Kingdom');
});

test('order details that do not prove a purchase are refused, not saved unverified', async () => {
  const { calls, post } = route();
  assert.equal((await post({ ...base, orderEmail: 'amaka@example.com', orderNumber: 'TMK-WRONG1' })).status, 400);
  assert.equal((await post({ ...base, orderEmail: 'someone@example.com', orderNumber: 'AB12CD' })).status, 400);
  assert.equal((await post({ ...base, orderEmail: 'amaka@example.com' })).status, 400);
  assert.equal(calls.length, 0);
});

test('an order can be used for one review only', async () => {
  const { post } = route({ create: () => { throw new DuplicateReviewError('already reviewed'); } });
  const result = await post({ ...base, orderEmail: 'amaka@example.com', orderNumber: 'AB12CD' });
  assert.equal(result.status, 409);
});

test('missing or invalid fields are rejected', async () => {
  const { calls, post } = route();
  assert.equal((await post({ ...base, rating: '5' })).status, 400);
  assert.equal((await post({ ...base, rating: 6 })).status, 400);
  assert.equal((await post({ ...base, comment: '  ' })).status, 400);
  assert.equal((await post({ ...base, customerName: 'x'.repeat(81) })).status, 400);
  assert.equal(calls.length, 0);
});

test('the hidden bot field gets a normal reply and saves nothing', async () => {
  const { calls, post } = route();
  const result = await post({ ...base, company: 'Acme SEO' });
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('review summary counts each star rating', () => {
  const utils = load('lib/reviews-utils.ts');
  const summary = utils.summarizeReviews([{ rating: 5 }, { rating: 5 }, { rating: 3 }]);
  assert.equal(summary.average, 4.3);
  assert.equal(summary.count, 3);
  assert.deepEqual(summary.stars, [0, 0, 1, 0, 2]);
  assert.equal(utils.reviewItemLabel({ item_color: 'Black', item_size: null }), 'Black');
  assert.equal(utils.reviewItemLabel({ item_color: 'Black', item_size: '2XL' }), 'Black, 2XL');
});
