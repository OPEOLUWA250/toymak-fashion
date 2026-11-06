import { getCookieConsent } from "./cookie-consent";
import type { CartItem, Order, Product } from "./types";

const META_PIXEL_ID = "1641239721033624";
const LAST_PURCHASE_KEY = "toymak-pixel-last-purchase";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  push?: Fbq;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
  allowDuplicatePageViews?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// The pixel reports the full page address with every event, so nothing may be
// sent while the address could hold something private: a Stripe session id or
// email token can be exchanged for customer details, and track-order links
// carry the customer's email. Admin pages aren't customer activity at all.
const PRIVATE_PATHS = ["/admin", "/track-order", "/unsubscribe"];
const PRIVATE_PARAMS = ["session_id", "reference", "trxref", "restore", "token", "email", "order"];

export function isPrivateUrl(pathname: string, search: string): boolean {
  if (PRIVATE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  const params = new URLSearchParams(search);
  return PRIVATE_PARAMS.some((param) => params.has(param));
}

/** Meta's standard loader, run only once a visitor has accepted. */
function loadPixel(): Fbq {
  if (window.fbq) return window.fbq;

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // Otherwise the pixel records its own PageView on every address change,
  // which would double count and bypass isPrivateUrl. Without that tracking it
  // would also drop every PageView after the first as a duplicate, so its
  // filter goes too: components/meta-pixel.tsx sends exactly one per page.
  fbq.disablePushState = true;
  fbq.allowDuplicatePageViews = true;
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  // Only the events below are sent: no automatic button-click tracking.
  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
  return fbq;
}

let revoked = false;

function send(...args: unknown[]): boolean {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return false;
  if (getCookieConsent() !== "granted") return false;
  if (isPrivateUrl(window.location.pathname, window.location.search)) return false;

  const fbq = loadPixel();
  if (revoked) {
    fbq("consent", "grant");
    revoked = false;
  }
  fbq(...args);
  return true;
}

/** Stops tracking and removes Meta's cookies when a visitor declines. */
export function stopMetaPixel() {
  if (typeof window === "undefined") return;
  if (window.fbq && !revoked) {
    window.fbq("consent", "revoke");
    revoked = true;
  }
  // Set on the main domain, so clear them there as well as on this host.
  const hostname = window.location.hostname;
  const domains = ["", `; domain=${hostname}`, `; domain=.${hostname.replace(/^www\./, "")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain}`;
    }
  }
}

export function trackPageView() {
  send("track", "PageView");
}

// Browsing events always report the GBP price: a product's value then stays
// the same whichever display currency a visitor has picked in the header.
export function trackViewContent(product: Pick<Product, "id" | "name" | "price_gbp">) {
  send("track", "ViewContent", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value: product.price_gbp,
    currency: "GBP",
  });
}

export function trackAddToCart(product: Pick<Product, "id" | "name" | "price_gbp">, quantity: number) {
  send("track", "AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    contents: [{ id: product.id, quantity }],
    value: product.price_gbp * quantity,
    currency: "GBP",
  });
}

export function trackInitiateCheckout(
  items: Pick<CartItem, "product_id" | "quantity">[],
  value: number,
  currency: string,
) {
  send("track", "InitiateCheckout", {
    content_ids: items.map((item) => item.product_id),
    content_type: "product",
    contents: items.map((item) => ({ id: item.product_id, quantity: item.quantity })),
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
    value,
    currency,
  });
}

/**
 * Reports the amount actually charged. A refresh of the confirmation page must
 * not count the sale twice, so the order is remembered here and its tracking
 * id doubles as the event id, which Meta uses to discard duplicates.
 */
export function trackPurchaseOnce(order: Pick<Order, "tracking_id" | "items" | "total_amount" | "currency">) {
  try {
    if (localStorage.getItem(LAST_PURCHASE_KEY) === order.tracking_id) return;
  } catch {
    // Storage blocked: Meta's event id check still catches duplicates.
  }

  const sent = send(
    "track",
    "Purchase",
    {
      content_ids: order.items.map((item) => item.product_id),
      content_type: "product",
      contents: order.items.map((item) => ({ id: item.product_id, quantity: item.quantity })),
      num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      value: order.total_amount,
      currency: order.currency,
    },
    { eventID: `purchase-${order.tracking_id}` },
  );
  if (!sent) return;

  try {
    localStorage.setItem(LAST_PURCHASE_KEY, order.tracking_id);
  } catch {
    // See above.
  }
}
