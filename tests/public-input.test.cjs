const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const response = { NextResponse: { json: (data, options = {}) => ({ data, status: options.status ?? 200 }) } };
const forbidden = () => { throw new Error('Invalid requests must not reach external services'); };
const routes = [
  ['app/api/contact/route.ts', { '@/lib/server/contact-store': { appendContactMessage: forbidden }, '@/lib/server/admin-auth': { adminRoute: handler => handler } }],
  ['app/api/reviews/route.ts', { '@/lib/server/reviews': { createReview: forbidden } }],
  ['app/api/orders/confirm/route.ts', { '@/lib/server/stripe-orders': { verifyStripeSession: forbidden }, '@/lib/server/paystack-orders': { verifyPaystackTransaction: forbidden }, '@/lib/server/order-store': { appendServerOrder: forbidden } }],
];
for (const [file, mocks] of routes) {
  test(`${file} rejects malformed and wrong-type input without external calls`, async () => {
    const { POST } = load(file, { 'next/server': response, ...mocks });
    for (const body of [null, [], 'invalid', {}, { productId: 'p', customerName: 1, comment: true }, { gateway: 'stripe', paymentId: 12 }]) {
      assert.equal((await POST({ json: async () => body })).status, 400);
    }
    assert.equal((await POST({ json: async () => { throw new SyntaxError('Invalid JSON'); } })).status, 400);
  });
}
