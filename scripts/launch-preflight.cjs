// Read-only checks. Never print environment values or customer records.
const { createRequire } = require('node:module');
const { loadEnvConfig } = createRequire(require.resolve('next/package.json'))('@next/env');
loadEnvConfig(process.cwd());
const fs = require('node:fs');
async function main() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYSTACK_SECRET_KEY', 'CRON_SECRET', 'NEXT_PUBLIC_SITE_URL'];
  const environment = Object.fromEntries(required.map(key => [key, Boolean(process.env[key])]));
  const modes = Object.fromEntries(['STRIPE_SECRET_KEY', 'PAYSTACK_SECRET_KEY'].map(key => [key, process.env[key]?.startsWith('sk_live_') ? 'live' : process.env[key]?.startsWith('sk_test_') ? 'test' : 'unknown']));
  const database = {};
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && key) {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    for (const table of ['products', 'store_settings', 'checkout_snapshots', 'orders', 'order_email_outbox', 'admin_users', 'email_opt_outs']) {
      const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, { headers, signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      database[table] = { status: response.status, ...(response.ok ? {} : { code: body.code }) };
    }
    const schemaResponse = await fetch(`${base}/rest/v1/`, { headers, signal: AbortSignal.timeout(15000) });
    const schema = await schemaResponse.json();
    database.record_paid_order = { schemaStatus: schemaResponse.status, present: Boolean(schema.paths?.['/rpc/record_paid_order']) };
  }
  const website = [];
  for (const path of ['/', '/shop', '/cart', '/checkout', '/track-order', '/api/products', '/api/settings', '/admin']) {
    try {
      const response = await fetch(`https://toymakfashion.com${path}`, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
      website.push({ path, status: response.status, finalUrl: response.url });
      await response.arrayBuffer();
    } catch (error) { website.push({ path, error: error.cause?.code || error.message }); }
  }
  const result = { environment, modes, emailConfigured: Boolean((process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) || (process.env.SMTP_USER && process.env.SMTP_PASSWORD)), database, website };
  fs.mkdirSync('artifacts/launch-audit', { recursive: true });
  fs.writeFileSync('artifacts/launch-audit/preflight.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.cause?.code || error.message); process.exitCode = 1; });
