import { Currency, OrderItem, Product } from "./types";

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
}

/**
 * Shared by the checkout page (for display) and the Paystack initialize route
 * (to compute the amount actually charged) so the two can never drift apart —
 * a client can't tamper with the total since the server recomputes it from
 * product_id/quantity against the real catalog, not from a client-sent price.
 *
 * Takes `products` as a parameter rather than looking them up internally so
 * this stays a plain, synchronous function usable from both server code
 * (which fetches products from Supabase) and client code (which fetches the
 * same catalog via GET /api/products) — it doesn't need to know or care
 * where the list came from.
 */
export function calculateOrderTotals(
  items: { product_id: string; quantity: number }[],
  currency: Currency,
  country: string,
  products: Product[],
): OrderTotals {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  const subtotal = items.reduce((runningTotal, item) => {
    const product = productLookup.get(item.product_id);
    return runningTotal + getProductPriceForCurrency(product, currency) * item.quantity;
  }, 0);

  const shippingThreshold = currency === "NGN" ? 50000 : 50;
  const shippingBase = currency === "NGN" ? 7999 : 7.99;
  const shipping = subtotal > shippingThreshold ? 0 : shippingBase;
  const tax = country.toLowerCase().includes("nigeria")
    ? subtotal * 0.075
    : subtotal * 0.2;
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total };
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
 */
export function buildOrderItems(
  items: OrderItemInput[],
  currency: Currency,
  products: Product[],
): OrderItem[] {
  const productLookup = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = productLookup.get(item.product_id);
    const unitPrice = getProductPriceForCurrency(product, currency);
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
