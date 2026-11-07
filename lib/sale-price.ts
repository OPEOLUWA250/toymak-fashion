import type { Currency, Product } from "./types";
import { currencySymbols } from "./pricing";

/*
 * Sale prices. A product on sale stores what shoppers pay in price_gbp,
 * price_ngn and price_usd (so checkout needs no changes), and its regular GBP
 * price in compare_at_price_gbp. The admin sets one sale price in GBP; naira and
 * dollar prices come down by the same percentage.
 */

export interface RegularPrices {
  gbp: number;
  ngn: number;
  usd: number;
}

type Priced = Pick<Product, "price_gbp" | "price_ngn" | "price_usd" | "compare_at_price_gbp">;

export function isOnSale(product: Pick<Product, "price_gbp" | "compare_at_price_gbp">): boolean {
  return product.compare_at_price_gbp !== undefined && product.compare_at_price_gbp !== null && product.compare_at_price_gbp > product.price_gbp && product.price_gbp > 0;
}

/** "-12%" for £17 down to £15. Never shows 0% for a real reduction. */
export function salePercent(regular: number, sale: number): number {
  if (!(regular > 0) || !(sale < regular)) return 0;
  return Math.max(1, Math.round(((regular - sale) / regular) * 100));
}

/** The crossed-out price in whichever currency is showing, from the exact ratio rather than the rounded percentage. */
export function compareAtFor(product: Pick<Product, "price_gbp" | "compare_at_price_gbp">, displayPrice: number): number | undefined {
  return isOnSale(product) ? displayPrice * (product.compare_at_price_gbp! / product.price_gbp) : undefined;
}

/** What the product costs when it isn't on sale, in every currency. Used to fill the admin form. */
export function regularPrices(product: Priced): RegularPrices {
  const usd = product.price_usd ?? 0;
  if (!isOnSale(product)) return { gbp: product.price_gbp, ngn: product.price_ngn, usd };
  const ratio = product.compare_at_price_gbp! / product.price_gbp;
  return { gbp: product.compare_at_price_gbp!, ngn: Math.round(product.price_ngn * ratio), usd: roundCents(usd * ratio) };
}

/**
 * The prices to save. With no sale price (or one that isn't lower) the product
 * sells at its regular prices. Otherwise every currency comes down by the same
 * percentage as the GBP price.
 */
export function applySale(regular: RegularPrices, saleGbp: number | null): Priced {
  if (saleGbp === null || !(saleGbp > 0) || !(saleGbp < regular.gbp)) {
    return { price_gbp: regular.gbp, price_ngn: regular.ngn, price_usd: regular.usd, compare_at_price_gbp: undefined };
  }
  const ratio = saleGbp / regular.gbp;
  return { price_gbp: saleGbp, price_ngn: Math.round(regular.ngn * ratio), price_usd: roundCents(regular.usd * ratio), compare_at_price_gbp: regular.gbp };
}

/** "£15.00" as its parts, so the pounds can be drawn larger than the pence. */
export function priceParts(amount: number, currency: Currency): { symbol: string; whole: string; fraction: string } {
  const [whole, fraction = "00"] = amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(".");
  return { symbol: currencySymbols[currency], whole, fraction };
}

const roundCents = (value: number) => Math.round(value * 100) / 100;
