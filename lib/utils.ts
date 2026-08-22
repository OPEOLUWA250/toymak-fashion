import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentGateway } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A schemeless URL like "www.royalmail.com/track" resolves as a relative
 * path against the current page (e.g. localhost:3000/www.royalmail.com/track)
 * instead of an external link, since an <a href> with no "://" is always
 * treated as relative. Admin-entered carrier tracking links go through here
 * before being stored or rendered so that mistake can't reach a customer.
 */
export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getPaymentGatewayForCountry(country: string): PaymentGateway {
  const normalizedCountry = country.trim().toLowerCase();

  if (["nigeria", "ng", "ngn"].includes(normalizedCountry)) {
    return "paystack";
  }

  if (
    [
      "united kingdom",
      "uk",
      "gb",
      "great britain",
      "britain",
      "england",
      "scotland",
      "wales",
      "northern ireland",
    ].includes(normalizedCountry)
  ) {
    return "stripe";
  }

  return "stripe";
}
