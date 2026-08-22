import { mockProducts } from "./mock-products";
import { Currency, OrderItem, Product } from "./types";

const productLookup = new Map(mockProducts.map((product) => [product.id, product]));

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
 * product_id/quantity against the mock catalog, not from a client-sent price.
 */
export function calculateOrderTotals(
  items: { product_id: string; quantity: number }[],
  currency: Currency,
  country: string,
): OrderTotals {
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
 * OrderItem records, looking up name/price from the mock catalog rather than
 * trusting anything the client claims — used by both gateways' initialize
 * and verify routes so a placed order's line items are always server-derived.
 */
export function buildOrderItems(items: OrderItemInput[], currency: Currency): OrderItem[] {
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
