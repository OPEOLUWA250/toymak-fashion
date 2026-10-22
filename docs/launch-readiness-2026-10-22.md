# Launch readiness audit — 22 October 2026

**Recommendation: hold launch pending the remaining fixes and payment verification.** The Vercel deployment is reachable. The user clarified that the new domain has not been connected yet; its parking/timeout is expected setup work, not a storefront outage. Several local fixes are not yet reflected in the deployed site, security dependency updates remain outstanding, and the complete payment/order/email lifecycle has not been verified.

This is a follow-up to `site-audit-2026-10-22.md`. Its findings about the cart, compare-at pricing, contact destination, and malformed contact/review requests are superseded by the fixes below. Earlier workspace changes were preserved. Nothing was deployed.

## Launch blockers and high-priority findings

### 1. Custom domain connection is pending; Vercel deployment is reachable

The user confirmed `https://toymakfashion.com` as the intended launch domain.

- Node HTTP requests to eight public paths timed out, including `/`, `/shop`, `/checkout`, and `/api/products`.
- Chromium independently failed to open the homepage with `ERR_CONNECTION_TIMED_OUT`.
- DNS resolved the apex to `192.64.119.163`.
- `www.toymakfashion.com` resolved through `parkingpage.namecheap.com` to `parking.d.parity.domains`.

The user subsequently confirmed that this newly purchased domain is intentionally not connected yet and supplied `https://toymak-fashion.vercel.app` as the current deployment. That deployment was accessible in Chromium. Connect the apex and www hostnames to the intended Vercel deployment, then verify HTTPS and redirects. DNS account settings were not accessed or changed.

Evidence: `artifacts/launch-audit/preflight.json`, `dns-apex.json`, `dns-www.json`, and `live/results.json`.

### Deployed-site follow-up

Checked `https://toymak-fashion.vercel.app` directly after the user supplied it:

- Seven routes at 375, 768, and 1440 pixels returned 200, with no uncaught page exceptions or document-wide overflow. Loaded-image checks reported no failures; this does not cover every lazy-loaded asset.
- The public catalog returned 38 products. Actual product size/colour selection and Add to Bag worked using browser-local state.
- Anonymous requests to `/api/orders`, `/api/admin/products`, and `/api/admin/admins` returned 401. `/admin` redirected to login.
- The deployed cart still uses GBP when NGN/USD is selected. The local cart fix has not reached this deployment.
- The deployed storefront still lacks the contact anchor. The local footer fix has not reached this deployment.
- The homepage canonical and sitemap URLs still point to `toymakenterprise.co.uk`. The production site URL must be updated to the intended domain when it is connected and the deployment rebuilt.
- An initial USD checkout observation caught the page before its catalog had finished loading and showed only shipping. Follow-up checks explicitly wait for the displayed product price before comparing totals; this is not evidence of missing USD product prices. Public catalog inspection found positive USD prices on all 36 in-stock products.

No forms, payments, emails, or administrative changes were submitted. Evidence: `artifacts/launch-audit/toymak-fashion.vercel.app/results.json` and `deployment-check.json`. Reproduction: `scripts/deployment-check.cjs`; `scripts/launch-browser.cjs` accepts `AUDIT_URL`.

### 2. Security dependency updates remain outstanding

The fresh production dependency audit reports **84 entries: 4 critical, 38 high, 38 moderate, and 4 low**. These are registry advisory entries, not 84 independently demonstrated exploitable application vulnerabilities. The installed framework is `next@16.2.6`; its advisory entries include fixes through 16.3.8. Some findings are transitive CLI/build dependencies, including the `shadcn` tree.

Update affected dependencies, align the Next.js lint package, and repeat the build, tests, and audit. Review applicability individually: Windows hosting, custom servers, image formats, and other conditions differ by advisory. The report does not assume that the production server runs Windows merely because this workspace does.

Evidence: `artifacts/launch-dependency-audit.json`. Framework versions were not changed in this pass.

### 3. Production payments and email delivery are not verified

The **local** environment has Stripe and Paystack **test** keys. Stripe webhook and cron secrets are present, and an email transport is configured. This does **not** establish whether the hosting environment has live keys or correctly registered webhooks.

Before accepting orders, verify on the intended deployment:

1. Production keys and the appropriate gateway account configuration.
2. Successful payment, cancellation, and pending-payment behavior.
3. A paid order is recorded when the browser never returns to the site.
4. Repeated webhook deliveries do not duplicate orders or stock deductions.
5. Customer receipt and merchant notification arrive; retry handling works after a mail failure.
6. Guest tracking and receipt download work for that order.

No live or sandbox purchases, customer emails, admin mutations, or deployments were performed. Automated payment/email tests use mocks.

### 4. Checkout can display incomplete or stale totals before charging current server totals

`app/checkout/page.tsx` calculates display totals from asynchronously loaded products and settings. Its payment button is disabled only while paying, and form validation does not require those reads to have succeeded. `lib/use-settings.ts` substitutes fallback settings on failure and can cache fallback settings returned after an API error. Server checkout independently loads current prices/settings.

The server-side recalculation prevents trusting forged client prices, but does not guarantee that a customer saw the charged total. A catalog/settings fetch failure or a price change between display and payment can create a mismatch. Require successful current pricing reads before paying and a review step when the server quote changes. This remains unresolved; the normal successful-fetch cart/checkout cases passed browser testing.

## Fixes completed locally

| Defect | Change and validation |
| --- | --- |
| Paystack verification outage could silently lose an order | `lib/server/paystack-orders.ts` now throws on HTTP/API verification errors and malformed verification responses. The webhook's existing error handler consequently responds with 500 instead of acknowledging a paid event without recording an order. Added outage regression coverage. [Paystack documents its webhook retry behavior here](https://paystack.com/docs/payments/webhooks/). |
| Cart always showed GBP and old saved prices | `app/cart/page.tsx` now uses the selected currency, current catalog prices, and the shared checkout total calculator. Shipping messaging uses the configured threshold. Browser tests deliberately stored a stale 0.01 price and verified current totals in GBP, NGN, and USD. |
| Rounded sale percentage distorted original prices | `components/product-card.tsx` uses the exact price ratio rather than dividing by a rounded percentage, avoiding the 100%-rounding division-by-zero case for positive prices. |
| Contact links led to a missing anchor | The footer's visible contact details now provide `id="contact"`. Browser checks confirm the destination exists on the storefront pages tested. |
| Pending payments claimed customers had not been charged | The success page now describes an unconfirmed payment and asks customers to check/refresh before trying again. |
| Malformed public input could throw uncontrolled errors | Contact, review, and order-confirmation handlers now reject invalid JSON, null/array payloads, and relevant wrong-type fields with 400 responses. Added tests confirming invalid requests do not call external services. |
| Default canonical/email origin used a different domain | `lib/site-url.ts` now defaults to `https://toymakfashion.com`, as confirmed by the user. Set `NEXT_PUBLIC_SITE_URL=https://toymakfashion.com` explicitly in production; that variable was absent locally. An existing deployment override still takes precedence. |

## Other outstanding findings

- **Shop currency filters:** `app/shop/page.tsx:146`, `:245`, and `:269` still filter and sort using GBP while product cards use the selected currency. Filter labels also remain GBP.
- **Lint:** final scan has **22 errors and 17 warnings**, primarily existing hook/state/ref rules, unescaped JSX text, and an explicit `any`. Build success does not mean lint passed. Findings were not suppressed.
- **Overlay accessibility:** focus trapping/restoration and background isolation still require attention in the first-order popup and mobile filter drawer. This was not a WCAG audit.
- **API abuse controls:** no application-level limiting was identified in the previously reviewed public contact/review/order-lookup paths. Deployed WAF limits were not accessible for verification.
- **Operational prerequisites:** the configured database exposes the required tables and `record_paid_order` RPC. These read-only schema checks do not verify function implementation, transactional concurrency, row-level security, stock accounting, or outbox delivery. The migration files referenced by `docs/store-reliability-setup.md` are absent from this checkout; restore those sources for reproducible database setup.
- **Email recovery timing:** the configured order-email retry cron runs daily; failed immediate sends may wait until the next scheduled run. Confirm that this delay meets the store's operational needs.

## Checks performed

| Check | Result |
| --- | --- |
| Automated regression suite | 70 passed, 0 failed |
| TypeScript | Passed |
| Production build after functional fixes | Passed; 89 generation tasks including 38 product pages |
| Final lint | Failed: 22 errors, 17 warnings |
| Local browser route sweep | 7 paths × 3 widths (375, 768, 1440): all 200, no uncaught page exceptions or document-wide overflow |
| Loaded image checks | No failed completed images on sampled visits; lazy images outside the viewport were not exhaustively checked |
| Populated cart → checkout | Matching totals in GBP (£37.99), NGN (₦53,750.00), USD ($41.74) for the selected live-catalog item |
| Required database schema | Seven required tables returned successful zero-row reads; `record_paid_order` was present in the API schema |
| Live storefront | Vercel URL passed 21 route/viewport checks; custom domain awaits connection |
| Real payment → persisted order → email → tracking | Not performed |

Browser requests that could submit forms or trigger mutations were blocked. Cart checks used browser-local data. Authenticated administration, actual gateway deliveries, email transport acceptance, mobile devices, Safari/Firefox, load testing, and production caching were not verified.

Reproduction scripts: `scripts/launch-preflight.cjs`, `scripts/launch-browser.cjs`, `scripts/launch-cart-check.cjs`. Browser scripts require `PLAYWRIGHT_PATH` pointing to an installed Playwright package; the local production server listens on port 3100. Audit artifacts are stored under the ignored `artifacts/` directory and contain no environment secrets or customer records.
