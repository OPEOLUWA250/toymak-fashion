export type ShippingMethod = "standard" | "express";

// Express is a UK-only courier service at a flat price (set in Settings) that
// never becomes free; standard uses the cost and free-shipping threshold from
// Settings. This default only applies until the saved settings load, or if
// the express_shipping_gbp column hasn't been added yet (docs/sql/0018).
export const DEFAULT_EXPRESS_SHIPPING_GBP = 7.99;

const ukCountryNames = ["united kingdom", "uk", "gb", "great britain", "england", "scotland", "wales", "northern ireland"];

export function isExpressAvailable(country: string) {
  return ukCountryNames.includes(country.trim().toLowerCase());
}

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return value === "standard" || value === "express";
}

export function shippingMethodLabel(method: ShippingMethod) {
  return method === "express" ? "Express" : "Standard";
}

/** Totals-row label for a placed order; older orders didn't record a method. */
export function orderShippingLabel(method: ShippingMethod | undefined) {
  return method ? `Shipping (${shippingMethodLabel(method)})` : "Shipping";
}

export function shippingEstimate(method: ShippingMethod, country: string) {
  if (method === "express") return "1 business day, Mon–Fri (order before 1pm)";
  return isExpressAvailable(country) ? "2 to 4 business days" : "7 to 14 business days";
}
