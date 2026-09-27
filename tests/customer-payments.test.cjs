const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const response = { NextResponse: { json: (data, options={}) => ({data,status:options.status??200}) } };
const guestOrder={id:'ord-1',tracking_id:'TMK-AB12CD',customer_email:'Buyer@Example.com'};
const guestStore=(orders=[guestOrder])=>({'./order-store':{getServerOrders:async()=>orders}});
const jsonRequest=body=>({json:async()=>body,headers:{get:()=>'application/json'}});
test('guest lookup requires an order number, not just an email',async()=>{
  const route=load('app/api/orders/lookup/route.ts',{'next/server':response,'./order-store':{getServerOrders:()=>{throw new Error('Must not be called')}}});
  assert.equal((await route.POST(jsonRequest({email:'buyer@example.com'}))).status,400);
});
test('guest lookup matches email case-insensitively and order number with or without prefix',async()=>{
  const route=load('app/api/orders/lookup/route.ts',{'next/server':response,...guestStore()});
  const found=await route.POST(jsonRequest({email:'buyer@example.com',orderNumber:' ab12cd '}));
  assert.equal(found.status,200);assert.equal(found.data.orders.length,1);
  assert.equal((await route.POST(jsonRequest({email:'buyer@example.com',orderNumber:'TMK-ZZZZZZ'}))).status,404);
});
test('knowing a customer email without the order number cannot download their receipt',async()=>{
  const route=load('app/api/orders/[id]/receipt/route.ts',{'next/server':response,...guestStore(),'@/lib/server/receipt-pdf':{generateReceiptPdf:()=>{throw new Error('Must not generate')}}});
  const params={params:Promise.resolve({id:'ord-1'})};
  assert.equal((await route.POST(jsonRequest({email:'buyer@example.com',orderNumber:'TMK-WRONG1'}),params)).status,404);
  assert.equal((await route.POST(jsonRequest({email:'buyer@example.com'}),params)).status,400);
});
test('Paystack failure/pending state never produces a paid order',async()=>{
  const original=global.fetch;process.env.PAYSTACK_SECRET_KEY='test-only';
  global.fetch=async()=>({ok:true,json:async()=>({status:true,data:{status:'pending'}})});
  try { const {verifyPaystackTransaction}=load('lib/server/paystack-orders.ts',{'./checkout-snapshots':{}});assert.equal(await verifyPaystackTransaction('test'),null); } finally {global.fetch=original;}
});
test('Stripe paid sessions validate the snapshot using gateway amount and currency',async()=>{
  let args;class Stripe { checkout={sessions:{retrieve:async()=>({payment_status:'paid',amount_total:1234,currency:'gbp',metadata:{checkout_snapshot_id:'snapshot'}})}} }
  process.env.STRIPE_SECRET_KEY='test-only';
  const {verifyStripeSession}=load('lib/server/stripe-orders.ts',{stripe:Stripe,'./checkout-snapshots':{verifyCheckoutSnapshot:async(...a)=>{args=a;return {total:12.34}}}});
  assert.equal((await verifyStripeSession('session')).total,12.34);assert.deepEqual(args,['snapshot','stripe',1234,'gbp']);
});
test('email provider failure is retryable and retries use the same prepared payload/key',async()=>{
  let fail=true;const sends=[];class Resend { emails={send:async(payload,options)=>{sends.push({payload,options});return {error:fail?{message:'temporary'}:null}}} }
  process.env.RESEND_API_KEY='test-only';
  const {sendPreparedOrderEmail}=load('lib/server/order-email.ts',{resend:{Resend},'./receipt-pdf':{}});
  const payload={from:'shop@example.com',to:'test@example.com',subject:'Receipt',html:'Test'};
  assert.equal(await sendPreparedOrderEmail(payload,'stable-key'),false);fail=false;
  assert.equal(await sendPreparedOrderEmail(payload,'stable-key'),true);assert.deepEqual(sends[0],sends[1]);
});
