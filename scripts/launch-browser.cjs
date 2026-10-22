const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const fs = require('node:fs');
const base = process.env.AUDIT_URL || 'https://toymakfashion.com';
const output = base.includes('localhost') ? 'artifacts/launch-audit/local' : `artifacts/launch-audit/${new URL(base).hostname}`;
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // Prevent accidental signups, saved-cart emails, or other mutations.
  await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('toymak-popup-dismissed-v2', 'true'));
  const page = await context.newPage();
  const results = [];
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/shop', '/cart', '/checkout', '/track-order', '/faq', '/admin/login']) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      try {
        const response = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1000);
        const details = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => image.getAttribute('src')),
          contactTarget: Boolean(document.getElementById('contact')),
          title: document.title,
        }));
        results.push({ width, path, status: response.status(), errors, ...details });
        if (path === '/') await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
      } catch (error) { results.push({ width, path, error: error.message }); }
      page.off('pageerror', onError);
      fs.writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
      console.log(JSON.stringify(results.at(-1)));
      if (results.at(-1).error && results.length === 1) break;
    }
    if (results.length === 1 && results[0].error) break;
  }
  await browser.close();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
