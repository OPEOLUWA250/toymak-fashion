const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { calculateOrderTotals, buildOrderItems } = load('lib/pricing.ts');
const { validateCheckoutItems } = load('lib/checkout-validation.ts');
const products = [{ id:'p',name:'Bra',price_gbp:28.99,price_ngn:57980,price_usd:36.82,stock_qty:5,sizes:['M'],colors:[{name:'Black'}],status:'active' }];
const item = { product_id:'p',quantity:3,size:'M',color:'Black' };
const settings = { shippingThreshold:{GBP:100,NGN:100000,USD:100},shippingCost:{GBP:3.99,NGN:2000,USD:5},tax:{GBP:20,NGN:0,USD:5} };
test('discounted line items and checkout totals agree to the penny', () => {
  for (const currency of ['GBP','NGN','USD']) {
    const totals = calculateOrderTotals([item], currency, products, settings, 15);
    const lines = buildOrderItems([item], currency, products, 15);
    assert.equal(Math.round(totals.subtotal*100), lines.reduce((n,l)=>n+Math.round(l.unit_price*100)*l.quantity,0));
    assert.equal(Math.round(totals.total*100),Math.round(totals.subtotal*100)+Math.round(totals.shipping*100)+Math.round(totals.tax*100));
  }
});
test('free shipping applies at the exact threshold', () => {
  assert.equal(calculateOrderTotals([{product_id:'p',quantity:1}],'GBP',[{...products[0],price_gbp:100}],settings).shipping,0);
});
test('rejects invalid quantities, missing products, unavailable options and drafts', () => {
  for (const quantity of [0,-1,1.5,NaN,Infinity,'2']) assert.throws(()=>validateCheckoutItems([{...item,quantity}],products,'GBP'));
  for (const patch of [{product_id:'missing'},{size:'XXL'},{color:'Pink'}]) assert.throws(()=>validateCheckoutItems([{...item,...patch}],products,'GBP'));
  assert.throws(()=>validateCheckoutItems([item],[{...products[0],status:'draft'}],'GBP'));
  assert.throws(()=>validateCheckoutItems([item],[{...products[0],price_usd:undefined}],'USD'));
});
test('stock validation aggregates duplicate cart rows and checks variant stock', () => {
  assert.throws(()=>validateCheckoutItems([item,item],products,'GBP'));
  assert.throws(()=>validateCheckoutItems([item],[{...products[0],variants:[{size:'M',color:'Black',stock:2}]}],'GBP'));
  assert.doesNotThrow(()=>validateCheckoutItems([{...item,quantity:2}],[{...products[0],variants:[{size:'M',color:'Black',stock:2}]}],'GBP'));
});
test('products without size or colour options remain purchasable',()=>{
  assert.doesNotThrow(()=>validateCheckoutItems([{...item,size:'Not applicable',color:'Default'}],[{...products[0],sizes:[],colors:[]}],'GBP'));
});
test('payment snapshot rejects amount/currency mismatch and preserves historical prices',async()=>{
  const snapshot={total:25.50,currency:'GBP',orderItems:[{unit_price:25.50}]};
  const query={select(){return this},eq(){return this},async single(){return {data:{verification:snapshot}}}};
  const {verifyCheckoutSnapshot}=load('lib/server/checkout-snapshots.ts',{'./supabase':{getSupabaseAdmin:()=>({from:()=>query})}});
  assert.deepEqual(await verifyCheckoutSnapshot('id','stripe',2550,'gbp'),snapshot);
  await assert.rejects(verifyCheckoutSnapshot('id','stripe',2500,'gbp'));
  await assert.rejects(verifyCheckoutSnapshot('id','stripe',2550,'usd'));
});
test('pending/failed Stripe payments never create successful verification',async()=>{
  class Stripe { checkout={sessions:{retrieve:async()=>({payment_status:'unpaid'})}} }
  process.env.STRIPE_SECRET_KEY='test-only';
  const {verifyStripeSession}=load('lib/server/stripe-orders.ts',{stripe:Stripe,'./checkout-snapshots':{},'@/lib/server/products':{},'@/lib/server/settings':{},'@/lib/server/signups':{}});
  assert.equal(await verifyStripeSession('test'),null);
});
test('order ids retain the full payment reference instead of colliding on six characters',()=>{
  const {buildOrderFromVerification}=load('lib/order-builder.ts');
  const v={customerName:'Test',customerEmail:'test@example.com',orderItems:[]};
  assert.notEqual(buildOrderFromVerification('a123456','stripe',v).id,buildOrderFromVerification('b123456','stripe',v).id);
});
