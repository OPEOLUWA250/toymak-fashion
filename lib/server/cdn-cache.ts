/**
 * Headers for public storefront data (catalog, settings, categories) that
 * every visitor requests. Vercel's CDN keeps one copy for 60 seconds and
 * keeps serving it for up to 5 more minutes while it refreshes in the
 * background, so the database sees about one read per minute instead of
 * one per page view. Browsers themselves don't cache it.
 *
 * Admin edits therefore reach shoppers within about a minute, the same as
 * the ISR product pages. Admin screens read uncached /api/admin/* routes
 * instead. Only use these on successful responses — errors must not be
 * cached.
 */
export const PUBLIC_CDN_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "max-age=60, stale-while-revalidate=300",
};
