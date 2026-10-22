const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const currency of ['GBP', 'NGN', 'USD']) {
      const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
      await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
      const productResponse = await context.request.get('http://localhost:3100/api/products');
      const { products } = await productResponse.json();
      const product = products.find(p => p.stock_qty > 0 && p.price_gbp > 0 && p.price_ngn > 0 && p.price_usd > 0);
      assert.ok(product, 'A product with prices in all currencies is needed');
      await context.addInitScript(({ product, currency }) => {
        localStorage.setItem('toymak-popup-dismissed-v2', 'true');
        localStorage.setItem('toymak-display-currency', currency);
        localStorage.setItem('toymak-cart', JSON.stringify([{
          product_id: product.id, product_name: product.name, image_url: product.images[0] || '',
          size: product.sizes[0] || '', color: product.colors[0]?.name || '', quantity: 1,
          price_at_addition: 0.01,
        }]));
      }, { product, currency });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://localhost:3100/cart');
      const expectedPrice = product[`price_${currency.toLowerCase()}`].toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const symbol = { GBP: '£', NGN: '₦', USD: '$' }[currency];
      await page.getByText(symbol + expectedPrice, { exact: true }).first().waitFor();
      const cartTotal = await page.getByText('Total', { exact: true }).locator('..').innerText();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.goto('http://localhost:3100/checkout');
      await page.getByText(symbol + expectedPrice, { exact: true }).first().waitFor();
      const checkoutTotal = await page.getByText('Total', { exact: true }).locator('..').innerText();
      assert.equal(checkoutTotal.replace(/\s/g, ''), cartTotal.replace(/\s/g, ''));
      assert.deepEqual(errors, []);
      results.push({ currency, currentCatalogPrice: expectedPrice, cartTotal, checkoutTotal, pass: true });
      await context.close();
    }
    fs.writeFileSync('artifacts/launch-audit/cart-check.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
