const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Install separately: npm install --prefix <temporary-dir> @electric-sql/pglite
// Set PGLITE_MODULE to <temporary-dir>/node_modules/@electric-sql/pglite.
const dependency = process.env.PGLITE_MODULE;
test('PostgreSQL migration, order atomicity, retries, variants, refunds and audit records', { skip: !dependency }, async t => {
  const { PGlite } = require(dependency);
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select null::uuid $$;");
    for (const name of ['0001_products.sql','0002_signups.sql','0004_orders.sql','0005_store_settings.sql','0006_signups_coupon_redemption.sql','0011_abandoned_carts.sql','0012_store_reliability.sql','0013_admin_users.sql','0014_attribution_and_email_opt_outs.sql']) await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',name),'utf8'));
    await db.exec(`insert into products(id,name,description,price_gbp,price_ngn,category,stock_qty,sku,variants) values ('p','Product','Description',10,20000,'shapewear',10,'TEST','[{"size":"M","color":"Black","stock":10}]');`);
    const order = (id, quantity=2) => ({id,tracking_id:id,customer_name:'Test',customer_email:'test@example.com',customer_phone:'',shipping_address:{},currency:'GBP',payment_gateway:'stripe',payment_reference:id,items:[{product_id:'p',quantity,size:'M',color:'Black'}],subtotal:10*quantity,shipping_cost:0,tax:0,discount_applied:0,total_amount:10*quantity});
    const record = o => db.query('select record_paid_order($1::jsonb,null) as added',[JSON.stringify(o)]);
    await t.test('replaying payment only deducts stock and queues email once',async()=>{
      assert.equal((await record(order('one'))).rows[0].added,true);
      assert.equal((await record(order('one'))).rows[0].added,false);
      const p=(await db.query("select stock_qty,variants from products where id='p'")).rows[0];
      assert.equal(p.stock_qty,8);assert.equal(p.variants[0].stock,8);
      assert.equal((await db.query('select count(*)::int as n from order_email_outbox')).rows[0].n,2);
    });
    await t.test('database failure rolls order and inventory back together',async()=>{
      await assert.rejects(record(order('invalid',-1)));
      assert.equal((await db.query("select count(*)::int as n from orders where id='invalid'")).rows[0].n,0);
      assert.equal((await db.query("select stock_qty from products where id='p'")).rows[0].stock_qty,8);
    });
    await t.test('two payments both decrement stock instead of overwriting each other',async()=>{
      await Promise.all([record(order('two')),record(order('three'))]);
      assert.equal((await db.query("select stock_qty from products where id='p'")).rows[0].stock_qty,4);
    });
    await t.test('stock shortage is recorded without discarding a paid order',async()=>{
      await record(order('shortage',5));
      assert.equal((await db.query("select stock_qty from products where id='p'")).rows[0].stock_qty,0);
      assert.match((await db.query("select fulfillment_issue from orders where id='shortage'")).rows[0].fulfillment_issue,/shortage/);
    });
    await t.test('email worker claims exclude in-flight and delivered jobs',async()=>{
      assert.equal((await db.query("select * from claim_order_emails('one')")).rows.length,2);
      assert.equal((await db.query("select * from claim_order_emails('one')")).rows.length,0);
      await db.exec("update order_email_outbox set sent_at=now() where order_id='one';");
      assert.equal((await db.query("select * from claim_order_emails('one')")).rows.length,0);
    });
    await t.test('refund recording is atomic, bounded, and idempotent',async()=>{
      const id=(await db.query("insert into return_requests(order_id,customer_email,reason) values ('one','test@example.com','Does not fit') returning id")).rows[0].id;
      await assert.rejects(db.query("select update_return_request($1,'refunded','',21,'refund-test')",[id]));
      await db.query("select update_return_request($1,'refunded','',10,'refund-test')",[id]);
      await db.query("select update_return_request($1,'refunded','',10,'refund-test')",[id]);
      assert.equal(Number((await db.query("select refunded_amount from orders where id='one'")).rows[0].refunded_amount),10);
      await assert.rejects(db.query("select update_return_request($1,'approved','',0,null)",[id]));
    });
    await t.test('mutations create an honest activity history',async()=>{
      const rows=(await db.query('select actor,action from admin_activity')).rows;
      assert.ok(rows.some(r=>r.action==='products:UPDATE'));
      assert.ok(rows.some(r=>r.action==='return_requests:UPDATE'));
      assert.ok(rows.every(r=>r.actor==='System or customer'));
    });
    await t.test('changes made through the admin API are attributed to that admin',async()=>{
      // PostgREST exposes request headers as request.headers; the server sets x-toymak-actor.
      await db.exec(`begin; select set_config('request.headers','{"x-toymak-actor":"owner@example.com"}',true); update products set name='Renamed' where id='p'; commit;`);
      const [latest]=(await db.query("select actor,action from admin_activity order by id desc limit 1")).rows;
      assert.deepEqual(latest,{actor:'owner@example.com',action:'products:UPDATE'});
      await db.exec(`begin; select set_config('request.headers','not json',true); update products set name='Again' where id='p'; commit;`);
      assert.equal((await db.query("select actor from admin_activity order by id desc limit 1")).rows[0].actor,'System or customer');
    });
    await t.test('admin roles, opt-outs and coupon cooldown columns exist, and migrations re-run safely',async()=>{
      await db.exec("insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001');");
      await db.exec("insert into admin_users(id,email,role,created_by) values ('00000000-0000-0000-0000-000000000001','staff@example.com','super_admin','owner@example.com');");
      await assert.rejects(db.exec("update admin_users set role='owner'"));
      await assert.rejects(db.exec("insert into email_opt_outs(email) values ('Mixed@Case.com')"));
      await db.exec("insert into email_opt_outs(email) values ('buyer@example.com'); update signups set email_last_sent_at=now();");
      for (const name of ['0013_admin_users.sql','0014_attribution_and_email_opt_outs.sql']) await db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',name),'utf8'));
      assert.equal((await db.query('select role from admin_users')).rows[0].role,'super_admin');
      assert.equal((await db.query('select count(*)::int as n from email_opt_outs')).rows[0].n,1);
      assert.ok((await db.query("select actor from admin_activity where action='admin_users:INSERT'")).rows.length===1);
    });
  } finally { await db.close(); }
});
