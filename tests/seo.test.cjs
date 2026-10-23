const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

const { productSlug, productPath, findProductBySlug } = load('lib/product-url.ts');
const { metaDescription, plainText, absoluteUrl, jsonLd, pageMetadata } = load('lib/seo.ts');
const { siteUrl } = load('lib/site-url.ts');

test('product URLs carry a readable name and the stable id', () => {
  assert.equal(productSlug({ id: 'prod-17', name: 'Total Package Boned Shapewear' }), 'total-package-boned-shapewear-prod-17');
  assert.equal(productSlug({ id: 'prod-1', name: 'Bra & Panty Set — Café Édition!' }), 'bra-and-panty-set-cafe-edition-prod-1');
  assert.equal(productSlug({ id: 'prod-2', name: '★★★' }), 'prod-2');
  assert.equal(productPath({ id: 'prod-17', name: 'Waist Trainer' }), '/product/waist-trainer-prod-17');
});

test('product lookup accepts the slug, a bare id, and a pre-rename slug', () => {
  const products = [
    { id: 'prod-1', name: 'Waist Trainer' },
    { id: 'prod-11', name: 'Body Shaper' },
  ];
  assert.equal(findProductBySlug(products, 'waist-trainer-prod-1').id, 'prod-1');
  assert.equal(findProductBySlug(products, 'prod-1').id, 'prod-1');
  assert.equal(findProductBySlug(products, 'old-name-prod-11').id, 'prod-11');
  assert.equal(findProductBySlug(products, 'body-shaper-prod-111'), undefined);
  assert.equal(findProductBySlug(products, 'nothing'), undefined);
});

test('marketplace copy becomes a clean search snippet that ends on a word', () => {
  const copy = 'About this item\n\n• Ultimate Slimming: contours and shapes your figure.\n\n• Comfortable Compression: breathable fabric.';
  assert.equal(plainText(copy), 'Ultimate Slimming: contours and shapes your figure. Comfortable Compression: breathable fabric.');
  const long = metaDescription('word '.repeat(60));
  assert.ok(long.length <= 155, long.length);
  assert.ok(long.endsWith('word…'));
  assert.equal(metaDescription('Short and sweet.'), 'Short and sweet.');
});

test('page metadata sets the canonical URL and matching social cards', () => {
  const meta = pageMetadata({ title: 'FAQs', description: 'Answers.', path: '/faq' });
  assert.equal(meta.alternates.canonical, `${siteUrl}/faq`);
  assert.equal(meta.openGraph.url, `${siteUrl}/faq`);
  assert.equal(meta.openGraph.title, 'FAQs | Toymak Fashion');
  assert.equal(meta.twitter.card, 'summary_large_image');
  assert.equal(pageMetadata({ title: 'Home', description: 'x', path: '/' }).alternates.canonical, siteUrl);
});

test('structured data uses absolute URLs and cannot close its script tag', () => {
  assert.equal(absoluteUrl('/shop-img/a.jpg'), `${siteUrl}/shop-img/a.jpg`);
  assert.equal(absoluteUrl('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  assert.ok(!jsonLd({ name: '</script><script>alert(1)</script>' }).includes('<'));
});
