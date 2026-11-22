import type { Address, Order } from "./types";

/**
 * Meta's "advanced matching": the buyer's contact details, sent with a
 * Purchase so Meta can match the sale to the person who saw an ad. Each value
 * is normalised the way Meta asks, then SHA-256 hashed in the browser, so the
 * email, phone and name never leave it readable.
 * https://developers.facebook.com/docs/meta-pixel/advanced/advanced-matching
 */
export type MatchingKey = "em" | "ph" | "fn" | "ln" | "ct" | "zp" | "country";
export type MatchingData = Partial<Record<MatchingKey, string>>;

export type MatchingSource = Partial<
  Pick<Order, "customer_email" | "customer_phone" | "customer_name"> & {
    shipping_address: Partial<Pick<Address, "city" | "postalCode" | "country">>;
  }
>;

const COUNTRY_CODES: Record<string, { iso: string; dial: string }> = {
  "united kingdom": { iso: "gb", dial: "44" },
  uk: { iso: "gb", dial: "44" },
  gb: { iso: "gb", dial: "44" },
  "great britain": { iso: "gb", dial: "44" },
  england: { iso: "gb", dial: "44" },
  scotland: { iso: "gb", dial: "44" },
  wales: { iso: "gb", dial: "44" },
  "northern ireland": { iso: "gb", dial: "44" },
  nigeria: { iso: "ng", dial: "234" },
  ng: { iso: "ng", dial: "234" },
  "united states": { iso: "us", dial: "1" },
  "united states of america": { iso: "us", dial: "1" },
  usa: { iso: "us", dial: "1" },
  us: { iso: "us", dial: "1" },
};

const lettersOnly = (value: string) => value.toLowerCase().replace(/[^\p{L}]/gu, "");

/** International digits with the country code, or nothing if that can't be worked out. */
function normalisePhone(raw: string, dial: string | undefined): string | undefined {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (!dial) return undefined;
  if (digits.startsWith(dial) && digits.length > dial.length + 8) return digits;
  if (dial === "1") return digits.length === 10 ? `1${digits}` : undefined;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `${dial}${digits}`;
}

/** UK postcodes go to area, district and sector ("SW1A 1AA" -> "sw1a1"), US ones to 5 digits. */
function normalisePostcode(raw: string, iso: string | undefined): string | undefined {
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!compact) return undefined;
  if (iso === "gb") return compact.length >= 5 ? compact.slice(0, -2) : undefined;
  if (iso === "us") return /^\d{5}/.test(compact) ? compact.slice(0, 5) : undefined;
  return compact;
}

/** The buyer's details in Meta's format, before hashing. Missing or unusable values are left out. */
export function normaliseMatchingData(source: MatchingSource): MatchingData {
  const address = source.shipping_address ?? {};
  const country = COUNTRY_CODES[(address.country ?? "").trim().toLowerCase()];
  const [first = "", ...rest] = (source.customer_name ?? "").trim().split(/\s+/);
  const data: MatchingData = {
    em: source.customer_email?.trim().toLowerCase() || undefined,
    ph: source.customer_phone ? normalisePhone(source.customer_phone, country?.dial) : undefined,
    fn: lettersOnly(first) || undefined,
    ln: rest.length ? lettersOnly(rest.join("")) || undefined : undefined,
    ct: address.city ? lettersOnly(address.city) || undefined : undefined,
    zp: address.postalCode ? normalisePostcode(address.postalCode, country?.iso) : undefined,
    country: country?.iso,
  };
  if (data.fn === "guest" && !data.ln) delete data.fn;
  for (const key of Object.keys(data) as MatchingKey[]) if (!data[key]) delete data[key];
  return data;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The buyer's details normalised and SHA-256 hashed, ready for the pixel. */
export async function hashedMatchingData(source: MatchingSource): Promise<MatchingData> {
  const normalised = normaliseMatchingData(source);
  const entries = await Promise.all(
    Object.entries(normalised).map(async ([key, value]) => [key, await sha256(value)] as const),
  );
  return Object.fromEntries(entries);
}
