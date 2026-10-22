# Site audit — 22 October 2026

The production build succeeds, but the site is not issue-free. Security dependency updates, currency consistency, contact navigation, accessibility, and lint cleanup remain outstanding.

## Scope and results

- Audited the local workspace and its production build, not a separately deployed website.
- `pnpm.cmd build`: PASS before and after fixes; all 89 build-generation tasks completed, including 38 product pages.
- `node --test tests/*.test.cjs`: PASS, 66 tests before and after fixes. Existing tests cover admin guards, checkout validation, payment verification, email retries, saved carts, and catalog states. These use mocks; they do not prove payment-provider delivery in production.
- `pnpm.cmd exec tsc --noEmit`: PASS; the final build also passed TypeScript.
- Chromium: 17 routes at 320, 375, 768, 1024, and 1440 CSS pixels (85 initial page/viewport combinations). Normal navigation produced expected status codes, no document-wide horizontal overflow, and no uncaught page exceptions. The nonexistent route correctly returned 404.
- Final targeted Chromium regression run: PASS, 8 scenarios covering malformed/blocked storage, tablet menu resizing, dark preference, short-screen popup, and simulated signup failure. Desktop search also fits at 1024, 1280, and 1440 pixels.
- Additional populated cart and checkout layouts checked at 320, 768, and 1440 pixels without horizontal overflow.
- Interaction testing found problems that a simple overflow check misses: the fixed tablet header clipped its contents, and a short-screen popup positioned its close button outside the viewport.
- Anonymous access to admin products/admin management returned 401; `/admin` redirected to login. `/api/admin/orders` does not exist and returned 404, so that response is not evidence of an authorization guard. Existing unit tests exercise the actual protected handlers.
- Lint previously could not run: ESLint and its configuration were missing. Installed ESLint 9 and the matching Next.js 16.2.6 config, added a CommonJS flat config, and added `test`/`typecheck` scripts. Final source scan reports **22 errors and 18 warnings**. These findings are not suppressed. CommonJS files are allowed to use `require`, as their file format requires.

## Confirmed issues fixed locally

| Issue | Evidence and change |
| --- | --- |
| Corrupt saved cart crashes the page | Storing `{}` under `toymak-cart` caused `i.reduce is not a function`. Cart loading now validates array entries and discards invalid data. |
| Browser storage errors crash providers | Cart and currency storage reads/writes were unguarded. They now tolerate denied/full storage and retain usable in-memory state. |
| Popup is unusable on short screens | At 667×375 its close button was approximately 96 pixels above the viewport. The panel now has a dynamic viewport height limit and vertical scrolling. |
| Failed signup gives no feedback; repeat submission remains enabled | Added an error alert, pending button text, a disabled submit button, and a pending-state guard. Verification uses an intercepted failure response and sends no email. |
| Tablet search clips navigation actions | At 768 pixels the header content measured 933 pixels, putting actions outside the screen. Tablet widths now use the mobile navigation; desktop starts at 1024 pixels. |
| Resizing an open mobile menu locks desktop scrolling | Body overflow remained `hidden` after resizing to desktop. A breakpoint listener closes the mobile menu and releases its scroll lock. Added menu expansion/control attributes and made the closed menu inert. |
| System dark mode conflicts with the light storefront | Body text became white while page backgrounds remained white. The root now explicitly selects the existing light theme, matching viewport metadata and the storefront design. |
| Free shipping differs between cart and checkout at the threshold | Cart used `>` while the shared checkout calculation uses `>=`. Cart now also grants free shipping at the exact configured threshold. |

Changes are local; nothing was deployed. Pre-existing edits to privacy, terms, product metadata, gallery, and footer were preserved.

## Outstanding findings, in priority order

### 1. High priority: vulnerable dependency versions

`pnpm.cmd audit --prod --json` reports **84 dependency vulnerability entries: 4 critical, 38 high, 38 moderate, 4 low**. These are registry classifications, not proof that every advisory is exploitable in this application. Some are transitive development/build utilities installed under production dependencies, notably the `shadcn` CLI tree.

The installed `next@16.2.6` is below the patched versions in 17 Next.js advisory entries. Examples:

- [Windows-hosted remote code execution](https://github.com/advisories/GHSA-p293-qw3h-jr36): affects relevant Windows-hosted Pages/App Router servers; patched in 16.3.3. The local host is Windows; production hosting was not independently verified. A Linux deployment does not satisfy this advisory's Windows condition.
- [Image optimization SSRF](https://github.com/advisories/GHSA-cjq9-62q9-8jv4): patched in 16.3.8; requires an attacker-controlled allow-listed remote URL. This project restricts remote images to its configured Supabase storage host, which narrows exposure.

Upgrade Next.js to a supported patched version, keep its lint config aligned, and review transitive findings individually. Do not interpret `audit --fix` as proof of safe remediation. Framework/dependency upgrades were not performed as part of this audit. ESLint 9 was selected for the existing toolchain's compatibility; the registry flags that major as out of support, so include tooling in the upgrade work.

Evidence: `artifacts/site-audit/dependency-audit.json`.

### 2. Medium priority: prices and sorting disagree with the selected currency

- `app/shop/page.tsx:146`: price range limits, filtering, sorting, and labels use GBP regardless of the header currency selection. Product cards use the selected currency, so the displayed numbers and filtering rules can disagree. Independent product currency prices need not have identical ordering.
- `app/cart/page.tsx:25`: the cart uses stored `price_at_addition` and GBP settings/labels; it does not use current catalog prices or the display currency. Checkout recomputes from current catalog data and shipping country. A price change or currency switch can therefore produce different cart and checkout totals. The server-side calculation prevents trusting client prices for the charge, but the customer-facing inconsistency remains.
- `components/product-card.tsx:39`: compare-at prices are reconstructed from a rounded discount percentage. This can differ from the configured original price (and a percentage rounding to 100 can cause division by zero). Use the exact price ratio or the original GBP compare-at value.
- The cart also hardcodes a £50 free-shipping trust message rather than using the configured threshold.

### 3. Medium priority: contact links have no destination section

`components/footer.tsx:103` and the FAQ link to `/#contact`, but the current homepage contains no `id="contact"`. The form lives only in `app/_home-hidden/page.tsx`, a private Next.js folder that is not a public route. Restore a reachable contact section/page or point those links at the visible contact channel. The existing mailto/telephone links remain usable.

### 4. Medium priority: accessibility of overlays and forms

Source review found that the first-order popup declares a modal dialog but does not move/trap/restore keyboard focus or make the background inert. The mobile filter drawer similarly lacks dialog semantics, focus management, Escape handling, and a body scroll lock. Several search/signup inputs rely on placeholders instead of persistent accessible labels. A screen-reader and keyboard pass is still needed; this was not a WCAG conformance audit.

### 5. Medium priority: malformed public API payloads and abuse controls

`app/api/contact/route.ts` and `app/api/reviews/route.ts` parse request JSON outside their error handling. Null or wrong-type fields can also throw instead of returning a structured 400 response. Review submission calls `.trim()` without first ensuring values are strings. Add runtime payload validation and controlled bad-request responses.

The reviewed contact/review/order-lookup route code has no application-level rate limiting. Hosting/WAF controls and Supabase service-side limits were not inspected, so absence of protection at deployment level is not established. Verify limits before exposing these endpoints to sustained abuse.

### 6. Lint remains failing

Final findings: 13 `react-hooks/set-state-in-effect` errors, 2 `react-hooks/refs` errors, 6 unescaped JSX entity errors, and 1 explicit `any` error. Warnings include unused variables/expressions, unused suppression comments, custom-font placement, and image alt handling. Some synchronous effects intentionally hydrate browser storage; review/refactor with SSR behavior in mind rather than removing them mechanically.

Evidence: `lint-results.json`. `pnpm.cmd lint` now correctly exits nonzero until the findings are resolved.

### 7. Lower priority: catalog fetching and stale settings

`useProducts()` independently fetches the full catalog for each mounted consumer, including header and page content. The catalog is client-loaded on the shop, so its initial HTML has a loading state rather than product cards. Consider a shared cache or server-provided initial data after measuring production performance.

`invalidateSettingsCache()` clears module variables but does not notify already-mounted `useSettings()` consumers, despite its comment promising that behavior. A mounted header or checkout may continue showing old settings after an admin save until remount/navigation. Server checkout still calculates from current settings.

## Evidence and reproduction

Browser scripts:

- `scripts/audit-site.cjs`: initial responsive route sweep and edge-case reproductions.
- `scripts/audit-interactions.cjs`: tablet search, resize, dark preference, populated cart/checkout, and anonymous route checks. Its tablet-search scenario records the pre-fix desktop-header behavior; after the fix use the regression script's mobile-menu scenario.
- `scripts/audit-regressions.cjs`: assertions for repaired storage, popup, navigation, and theme behavior; signup POST is intercepted.

Scripts use the locally available Playwright package via `PLAYWRIGHT_PATH`, rather than adding it to runtime dependencies. Start a production server on port 3100, set that variable to a Playwright installation, then run the selected script with Node. Chromium must be installed. Local screenshots and JSON results are ignored under `artifacts/site-audit/`.

Initial evidence: `results.json`, `interactions.json`, `tablet-search.png`, `popup-short.png`. Final regression evidence: `regressions.json`, `tablet-fixed.png`, `popup-fixed.png`.

## Limits

No live purchases, payment sessions, email submissions, admin mutations, or deployments were performed. Populated-cart checks use browser-local data. Authenticated admin screens were source/unit-test reviewed but not exercised through a logged-in browser. Chromium was used; Safari, Firefox, physical phones, mobile keyboards, assistive technologies, deployed caching/headers, real webhook delivery, concurrent inventory purchases, and production load were not verified. Image checks cover images loaded during the sampled visits, not every lazy-loaded asset or every product. Local Vercel Analytics requests returned 404 because this was a local production server, not Vercel hosting; that alone is not a deployed-site defect.
