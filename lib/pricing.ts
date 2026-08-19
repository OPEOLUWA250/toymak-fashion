import { mockProducts } from "./mock-products";
import { Currency, Product } from "./types";

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
  const productLookup = new Map(mockProducts.map((product) => [product.id, product]));

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
