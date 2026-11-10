import { Currency, OrderItem, Product } from "./types";
import type { StoreSettings } from "./server/settings";
import type { ShippingMethod } from "./shipping";

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

/** Total shipment weight for the requested quantities, defaulting old products to 0.5 kg. */
export function calculateParcelWeight(
  items: { product_id: string; quantity: number }[],
  products: Product[],
): number {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  const total = items.reduce(
    (sum, item) => sum + (productLookup.get(item.product_id)?.weight_kg ?? 0.5) * item.quantity,
    0,
  );
  return Math.max(0, Math.round(total * 1000) / 1000);
}

function weightSurcharge(
  weightKg: number,
  currency: Currency,
  settings: StoreSettings,
): number {
  const additionalKg = Math.max(0, Math.ceil(weightKg - 0.5));
  if (additionalKg === 0) return 0;
  const gbpToCurrency = currency === "GBP"
    ? 1
    : currency === "NGN"
      ? settings.exchangeRates?.gbpToNgn ?? 1
      : settings.exchangeRates?.gbpToUsd ?? 1;
  return additionalKg * gbpToCurrency;
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
 * Standard shipping is keyed by currency (not country) since currency is
 * already deterministic from the gateway/country choice made earlier in
 * checkout — this is what makes the admin's Settings page numbers the same
 * ones actually charged, not a separate copy that can drift. Both methods
 * add £1-equivalent for each additional kg above 0.5 kg, rounded up.
 * Standard can still become free at its configured subtotal threshold;
 * express never becomes free.
 *
 * No VAT is added on top: prices are charged as listed, so `tax` is always 0
 * (the field stays for orders recorded before VAT was removed).
 *
 * `discountPercent` (0 unless a validated coupon is applied) comes off the
 * raw subtotal, matching what buildOrderItems bakes into each item's unit
 * price — `subtotal` here is already the discounted figure, `discount` is
 * the amount that was taken off, kept only for display.
 */
export function calculateOrderTotals(
  items: { product_id: string; quantity: number }[],
  currency: Currency,
  products: Product[],
  settings: StoreSettings,
  discountPercent = 0,
  shippingMethod: ShippingMethod = "standard",
): OrderTotals {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  const rawMinor = items.reduce((sum, item) => sum + Math.round(getProductPriceForCurrency(productLookup.get(item.product_id), currency) * 100) * item.quantity, 0);
  const subtotalMinor = items.reduce((sum, item) => sum + Math.round(getProductPriceForCurrency(productLookup.get(item.product_id), currency) * (1 - discountPercent / 100) * 100) * item.quantity, 0);
  const discount = (rawMinor - subtotalMinor) / 100;
  const subtotal = subtotalMinor / 100;
  if (shippingMethod === "express" && currency !== "GBP") throw new Error("Express delivery is only available in the UK.");
  const weightCost = weightSurcharge(calculateParcelWeight(items, products), currency, settings);
  const shippingMinor = shippingMethod === "express"
    ? Math.round((settings.expressShippingGBP + weightCost) * 100)
    : subtotal >= settings.shippingThreshold[currency]
      ? 0
      : Math.round((settings.shippingCost[currency] + weightCost) * 100);
  const shipping = shippingMinor / 100;
  const total = (subtotalMinor + shippingMinor) / 100;

  return { subtotal, shipping, tax: 0, total, discount };
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
      weight_kg: product?.weight_kg ?? 0.5,
    };
  });
}
