import type { MouseEvent } from "react";
import type { ProductCategory } from "./types";

/** Shopper-facing category names, in the order the shop lists them. */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  shapewear: "Shapewear",
  "waist-trainer": "Waist Trainers",
  bra: "Bras",
  tops: "Tops",
  accessories: "Accessories",
};

/**
 * Links into the shop (now the home page) from the header and footer. They
 * land on the product list ("#products") rather than the hero, and announce
 * themselves so the shop can reset its filters even when the URL is already
 * the same — e.g. tapping "Shapewear" again after picking other filters.
 */
export const SHOP_NAVIGATE_EVENT = "toymak:shop-navigate";

export function shopHref(params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params).toString();
  return `/${query ? `?${query}` : ""}#products`;
}

export function announceShopNavigation() {
  window.dispatchEvent(new Event(SHOP_NAVIGATE_EVENT));
}

/**
 * Goes to a shop URL from code (e.g. the header search).
 *
 * When the visitor is already on that page, Next.js 16 can ignore a
 * navigation that only drops or changes the query string (seen when the page
 * was opened with one, e.g. "/?sort=newest" -> "/" does nothing). The
 * browser's history API is synced with useSearchParams by Next.js and doesn't
 * have that problem, so same-page moves go through it instead.
 */
export function goToShop(href: string, push: (href: string) => void) {
  announceShopNavigation();
  const target = new URL(href, window.location.href);
  if (target.pathname !== window.location.pathname) {
    push(href);
    return;
  }
  window.history.pushState(null, "", target.pathname + target.search + target.hash);
  if (!target.hash) window.scrollTo({ top: 0, behavior: "smooth" });
}

/** onClick for a <Link> into the shop; see goToShop. */
export function handleShopLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  // Leave new-tab/new-window clicks to the browser.
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const samePage = new URL(href, window.location.href).pathname === window.location.pathname;
  // From other pages the Link itself navigates; this only announces.
  if (samePage) event.preventDefault();
  goToShop(href, () => {});
}
