const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Render the real pages with controlled catalog responses; no database writes.
function loadPage(file, mocks) {
  const filename = path.resolve(__dirname, "..", file);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded.require = (specifier) => Object.hasOwn(mocks, specifier)
    ? mocks[specifier] : Module.prototype.require.call(loaded, specifier);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText, filename);
  return loaded.exports.default;
}

const shellMocks = {
  "@/lib/site-url": { siteUrl: "https://example.com" },
  "@/components/header": () => React.createElement("header", null, "Site navigation"),
  "@/components/footer": () => React.createElement("footer", null, "Site footer"),
  "next/link": ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
};

function product(id, date = "2026-09-01") {
  return {
    id, name: `Product ${id}`, description: "A product", images: [],
    price_gbp: 20, category: "shapewear", sizes: [], colors: [],
    stock_qty: 1, created_at: new Date(date),
  };
}

async function homeMarkup(products) {
  const Home = loadPage("app/page.tsx", {
    ...shellMocks,
    "@/lib/server/products": { getAllProducts: async () => products },
    "@/lib/server/reviews": { getAllApprovedReviews: async () => [] },
    "@/lib/faq-data": { faqSections: Array.from({ length: 5 }, () => ({ questions: [{}] })) },
    "@/components/store-image": { StoreImage: () => null },
    "@/components/hero-carousel": { HeroCarousel: () => React.createElement("div", null, "Home hero") },
    "@/components/scroll-carousel": { ScrollCarousel: ({ children }) => React.createElement("div", null, children) },
    "@/components/testimonial-stack": { TestimonialStack: () => null },
    "@/components/testimonial-card": { TestimonialCard: () => null },
    "@/components/contact-faq-section": { ContactFaqSection: () => React.createElement("section", null, "Contact and FAQ") },
    "@/components/first-order-popup": { FirstOrderPopup: () => null },
    "@/components/recently-viewed": { RecentlyViewed: () => null },
  });
  return renderToStaticMarkup(await Home());
}

function shopMarkup({ products = [], isLoading = false, error = null, query = "" } = {}) {
  const Shop = loadPage("app/shop/page.tsx", {
    ...shellMocks,
    "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
    "@/lib/use-products": { useProducts: () => ({ products, isLoading, error }) },
    "@/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
    "@/components/product-card": { ProductCard: ({ product }) => React.createElement("div", null, product.name) },
  });
  return renderToStaticMarkup(React.createElement(Shop));
}

test("empty homepage retains navigation, hero, informational sections, and footer", async () => {
  const html = await homeMarkup([]);
  for (const content of ["Site navigation", "Home hero", "Featured products are on the way", "Our Mission", "Contact and FAQ", "Site footer"]) {
    assert.ok(html.includes(content), `Missing ${content}`);
  }
  assert.doesNotMatch(html, /href="\/product\//);
  assert.doesNotMatch(html, /What Customers Are Saying/);
});

test("one product renders without an empty second column", async () => {
  const html = await homeMarkup([product("one")]);
  assert.match(html, /href="\/product\/one"/);
  assert.doesNotMatch(html, /Featured products are on the way|lg:grid-cols-\[1\.3fr_1fr\]/);
});

test("two products render newest first without reserving an empty third tile", async () => {
  const html = await homeMarkup([product("older"), product("newer", "2026-09-02")]);
  assert.ok(html.indexOf('href="/product/newer"') < html.indexOf('href="/product/older"'));
  assert.doesNotMatch(html, /grid-rows-2/);
});

test("homepage shows featured products ahead of newer, non-featured ones", async () => {
  const html = await homeMarkup([
    product("newest-plain", "2026-09-10"),
    { ...product("featured-old", "2026-01-01"), featured: true },
    { ...product("featured-new", "2026-05-01"), featured: true },
  ]);
  assert.ok(html.indexOf('href="/product/featured-new"') < html.indexOf('href="/product/featured-old"'));
  assert.doesNotMatch(html, /href="\/product\/newest-plain"/);
  assert.match(html, />Featured</);
});

test("empty shop explains availability, including when a category link was followed", () => {
  const html = shopMarkup({ query: "category=shapewear" });
  assert.match(html, /New arrivals are on the way/);
  assert.match(html, /Site navigation/);
  assert.match(html, /Site footer/);
  assert.doesNotMatch(html, /No products match your filters|Loading products/);
});

test("shop distinguishes loading, request failure, and filters with no matches", () => {
  const loading = shopMarkup({ isLoading: true });
  assert.match(loading, /Loading products/);
  assert.doesNotMatch(loading, /New arrivals are on the way|No products match/);

  const failed = shopMarkup({ error: "Network failed" });
  assert.match(failed, /load the collection/);
  assert.doesNotMatch(failed, /New arrivals are on the way/);

  const filtered = shopMarkup({ products: [product("one")], query: "q=not-in-catalog" });
  assert.match(filtered, /No products match your filters/);
  assert.doesNotMatch(filtered, /New arrivals are on the way/);
});
