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

const { load } = require("./helpers.cjs");
// Product links are /product/<name-slug>-<id>; product(id) is named "Product <id>".
const productHref = (id) => `href="/product/product-${id}-${id}"`;

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

// The original landing page, switched off while the shop is the home page.
async function homeMarkup(products) {
  const Home = loadPage("app/_home-hidden/page.tsx", {
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
    "@/lib/product-url": load("lib/product-url.ts"),
  });
  return renderToStaticMarkup(await Home());
}

function shopMarkup({ products = [], isLoading = false, error = null, query = "" } = {}) {
  const Shop = loadPage("components/shop-view.tsx", {
    ...shellMocks,
    "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
    "@/lib/use-products": { useProducts: () => ({ products, isLoading, error }) },
    "@/lib/shop-navigation": load("lib/shop-navigation.ts"),
    "@/lib/utils": { cn: (...parts) => parts.filter(Boolean).join(" ") },
    "@/components/product-card": { ProductCard: ({ product }) => React.createElement("div", null, product.name) },
    "@/components/banner-carousel": {
      BannerCarousel: ({ banners }) => React.createElement("div", null, banners.map((b) => React.createElement("a", { key: b.src, href: b.href }, b.alt))),
    },
  });
  return renderToStaticMarkup(React.createElement(Shop, { initialProducts: products }));
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
  assert.ok(html.includes(productHref("one")));
  assert.doesNotMatch(html, /Featured products are on the way|lg:grid-cols-\[1\.3fr_1fr\]/);
});

test("two products render newest first without reserving an empty third tile", async () => {
  const html = await homeMarkup([product("older"), product("newer", "2026-09-02")]);
  assert.ok(html.indexOf(productHref("newer")) < html.indexOf(productHref("older")));
  assert.doesNotMatch(html, /grid-rows-2/);
});

test("homepage shows featured products ahead of newer, non-featured ones", async () => {
  const html = await homeMarkup([
    product("newest-plain", "2026-09-10"),
    { ...product("featured-old", "2026-01-01"), featured: true },
    { ...product("featured-new", "2026-05-01"), featured: true },
  ]);
  assert.ok(html.indexOf(productHref("featured-new")) < html.indexOf(productHref("featured-old")));
  assert.ok(!html.includes(productHref("newest-plain")));
  assert.match(html, />Featured</);
});

function rootPage(getAllProducts) {
  return loadPage("app/page.tsx", {
    ...shellMocks,
    "@/lib/server/products": { getAllProducts },
    "@/lib/seo": load("lib/seo.ts"),
    "@/lib/site-info": load("lib/site-info.ts"),
    "@/components/shop-view": {
      __esModule: true,
      default: ({ initialProducts }) => React.createElement("main", null, `Shop page: ${initialProducts.map((p) => p.name).join(", ")}`),
    },
    "@/components/first-order-popup": { FirstOrderPopup: () => React.createElement("aside", null, "First order popup") },
  });
}

test("the home page is the shop, with the first-order popup", async () => {
  const Root = rootPage(async () => [product("one")]);
  const html = renderToStaticMarkup(await Root());
  // Products come from the server, so the catalog is in the page's HTML.
  assert.match(html, /Shop page: Product one/);
  assert.match(html, /First order popup/);
  assert.match(html, /"@type":"Organization"/);
});

test("the home page still renders when the catalog can't be read", async () => {
  const Root = rootPage(async () => { throw new Error("Database unreachable"); });
  const html = renderToStaticMarkup(await Root());
  assert.match(html, /Shop page: </);
});

test("shop opens with the hero banners, which link to the products", () => {
  const html = shopMarkup({ products: [product("one")] });
  assert.match(html, /Sculpt your curves/);
  assert.match(html, /Love your shape/);
  assert.match(html, /href="#products"/);
  assert.match(html, /id="products"/);
  assert.ok(html.indexOf("Sculpt your curves") < html.indexOf("Product one"));
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

test("menu and footer shop links land on the product list", () => {
  const { shopHref } = load("lib/shop-navigation.ts");
  assert.equal(shopHref(), "/#products");
  assert.equal(shopHref({ category: "waist-trainer" }), "/?category=waist-trainer#products");
  assert.equal(shopHref({ q: "high waist & tummy" }), "/?q=high+waist+%26+tummy#products");
});
