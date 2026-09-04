import { Currency, OrderItem, Product } from "./types";
import type { StoreSettings } from "./server/settings";

export const currencySymbols: Record<Currency, string> = {
  GBP: "£",
  NGN: "₦",
  USD: "$",
};

export function formatCurrency(amount: number, currency: Currency) {
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbols[currency]}${formatted}`;
}

export function getProductPriceForCurrency(
  product: Product | undefined,
  currency: Currency,
) {
  if (!product) {
    return 0;
  }

  if (currency === "NGN") {
    return product.price_ngn;
  }

  if (currency === "USD") {
    return product.price_usd ?? product.price_gbp;
  }

  return product.price_gbp;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  discount: number;
}

/**
 * Shared by the checkout page (for display) and the Paystack initialize route
 * (to compute the amount actually charged) so the two can never drift apart —
 * a client can't tamper with the total since the server recomputes it from
 * product_id/quantity against the real catalog, not from a client-sent price.
 *
 * Takes `products` and `settings` as parameters rather than looking them up
 * internally so this stays a plain, synchronous function usable from both
 * server code (which fetches from Supabase) and client code (which fetches
 * the same data via GET /api/products and GET /api/settings) — it doesn't
 * need to know or care where either list came from.
 *
 * Tax and shipping are keyed by currency (not country) since currency is
 * already deterministic from the gateway/country choice made earlier in
 * checkout — this is what makes the admin's Settings page numbers the same
 * ones actually charged, not a separate copy that can drift.
 *
 * `discountPercent` (0 unless a validated coupon is applied) comes off the
 * raw subtotal before tax, matching what buildOrderItems bakes into each
 * item's unit price — `subtotal` here is already the discounted figure,
 * `discount` is the amount that was taken off, kept only for display.
 */
export function calculateOrderTotals(
  items: { product_id: string; quantity: number }[],
  currency: Currency,
  products: Product[],
  settings: StoreSettings,
  discountPercent = 0,
): OrderTotals {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  const rawSubtotal = items.reduce((runningTotal, item) => {
    const product = productLookup.get(item.product_id);
    return runningTotal + getProductPriceForCurrency(product, currency) * item.quantity;
  }, 0);

  const discount = rawSubtotal * (discountPercent / 100);
  const subtotal = rawSubtotal - discount;

  const shippingThreshold = settings.shippingThreshold[currency];
  const shippingBase = settings.shippingCost[currency];
  const shipping = subtotal > shippingThreshold ? 0 : shippingBase;
  const tax = subtotal * (settings.tax[currency] / 100);
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total, discount };
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  size: string;
  color: string;
}

/**
 * Turns client-sent {product_id, quantity, size, color} into full priced
 * OrderItem records, looking up name/price from the real catalog rather than
 * trusting anything the client claims — used by both gateways' initialize
 * and verify routes so a placed order's line items are always server-derived.
 *
 * `discountPercent` bakes a validated coupon straight into each unit price
 * (rounded to the cent) so every downstream consumer — the gateway's own
 * line items, the stored order, calculateOrderTotals — sums to the same
 * already-discounted number without needing a separate negative line item.
 */
export function buildOrderItems(
  items: OrderItemInput[],
  currency: Currency,
  products: Product[],
  discountPercent = 0,
): OrderItem[] {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = productLookup.get(item.product_id);
    const rawUnitPrice = getProductPriceForCurrency(product, currency);
    const unitPrice = Math.round(rawUnitPrice * (1 - discountPercent / 100) * 100) / 100;
    return {
      product_id: item.product_id,
      product_name: product?.name ?? "Unknown product",
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unit_price: unitPrice,
      subtotal: unitPrice * item.quantity,
    };
  });
}
