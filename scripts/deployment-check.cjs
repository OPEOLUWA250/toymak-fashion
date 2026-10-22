const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const fs = require('node:fs');
const base = process.env.AUDIT_URL || 'https://toymak-fashion.vercel.app';
const output = `artifacts/launch-audit/${new URL(base).hostname}`;
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('toymak-popup-dismissed-v2', 'true'));
  const result = { access: [], currencies: [] };
  try {
    const catalogResponse = await context.request.get(base + '/api/products');
    const { products } = await catalogResponse.json();
    result.catalog = { status: catalogResponse.status(), count: products?.length };
    const product = products.find(p => p.stock_qty > 0 && !p.variants?.length && p.price_usd > 0) || products.find(p => p.stock_qty > 0);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/product/' + product.id, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const variant = product.variants?.find(v => v.stock > 0);
    const size = variant?.size || product.sizes[0];
    const color = variant?.color || product.colors[0]?.name;
    if (size && product.sizes.includes(size)) await page.getByRole('button', { name: size, exact: true }).click();
    if (color && product.colors.some(c => c.name === color)) await page.getByRole('button', { name: color, exact: true }).click();
    await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('toymak-cart') || '[]').length > 0);
    result.addToBag = true;
    for (const currency of ['GBP', 'NGN', 'USD']) {
      await page.evaluate(currency => localStorage.setItem('toymak-display-currency', currency), currency);
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Shopping Cart', exact: true }).waitFor();
      await page.waitForTimeout(1200);
      const cartTotal = await page.getByText('Total', { exact: true }).locator('..').innerText();
      const catalogLoaded = page.waitForResponse(response => response.url().endsWith('/api/products') && response.status() === 200);
      await page.goto(base + '/checkout', { waitUntil: 'domcontentloaded' });
      await catalogLoaded;
      const expectedPrice = { GBP: '£', NGN: '₦', USD: '$' }[currency] + product[`price_${currency.toLowerCase()}`].toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      await page.getByText(expectedPrice, { exact: true }).first().waitFor();
      await page.waitForTimeout(500);
      const checkoutTotal = await page.getByText('Total', { exact: true }).locator('..').innerText();
      result.currencies.push({ currency, cartTotal, checkoutTotal });
    }
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    result.canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    for (const path of ['/api/settings', '/api/orders', '/api/admin/products', '/api/admin/admins', '/admin', '/sitemap.xml']) {
      const response = await context.request.get(base + path);
      result.access.push({ path, status: response.status(), finalUrl: response.url() });
      if (path === '/sitemap.xml') result.sitemapHosts = [...new Set([...((await response.text()).matchAll(/<loc>(.*?)<\/loc>/g))].map(match => new URL(match[1]).hostname))];
    }
    result.errors = errors;
  } catch (error) { result.error = error.message; process.exitCode = 1; }
  finally {
    fs.writeFileSync(`${output}/deployment-check.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
  }
})();
