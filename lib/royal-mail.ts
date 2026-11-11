/**
 * Shipping with Royal Mail Click & Drop: the admin's settings and the record
 * kept on each order. Shared by the server (lib/server/royal-mail-orders.ts)
 * and the admin and customer pages.
 *
 * Paid UK orders are sent to Click & Drop with Tracked 48 (standard) or
 * Tracked 24 (express) already chosen. On a pay-as-you-go account the admin
 * pays for and prints the labels in Click & Drop; the tracking number then
 * comes back to the order, which turns "shipped", and the customer is
 * emailed it.
 */

export type RoyalMailPackageFormat = "largeLetter" | "smallParcel" | "mediumParcel";

export interface RoyalMailSettings {
  /** Send every paid UK order to Click & Drop as soon as it comes in. */
  autoSend: boolean;
  /** A Click & Drop service code. Blank: Royal Mail Tracked 48, found on the account. */
  standardService: string;
  standardServiceName: string;
  /** Blank: Royal Mail Tracked 24, found on the account. */
  expressService: string;
  expressServiceName: string;
  /** How orders are packed. Heavier orders move up a size automatically. */
  packageFormat: RoyalMailPackageFormat;
  /** Per item, for products saved before they had a weight. */
  fallbackWeightKg: number;
}

export const defaultRoyalMailSettings: RoyalMailSettings = {
  autoSend: true,
  standardService: "",
  standardServiceName: "",
  expressService: "",
  expressServiceName: "",
  packageFormat: "smallParcel",
  fallbackWeightKg: 0.5,
};

/** Royal Mail's weight limits for each size, in grams. */
export const packageFormats: Record<RoyalMailPackageFormat, { label: string; maxGrams: number }> = {
  largeLetter: { label: "Large letter (up to 750 g, 2.5 cm thick)", maxGrams: 750 },
  smallParcel: { label: "Small parcel (up to 2 kg, 45 × 35 × 16 cm)", maxGrams: 2000 },
  mediumParcel: { label: "Medium parcel (up to 20 kg, 61 × 46 × 46 cm)", maxGrams: 20000 },
};

/** The packed size for this weight: the chosen one, or the next one up if it's too heavy. */
export function packageFormatFor(grams: number, preferred: RoyalMailPackageFormat): RoyalMailPackageFormat {
  const order: RoyalMailPackageFormat[] = ["largeLetter", "smallParcel", "mediumParcel"];
  const fits = order.slice(order.indexOf(preferred)).find((format) => grams <= packageFormats[format].maxGrams);
  return fits ?? "mediumParcel";
}

export const defaultServiceLabels = {
  standard: "Royal Mail Tracked 48",
  express: "Royal Mail Tracked 24",
} as const;

export type RoyalMailStatus =
  /** Being sent to Click & Drop right now (or a send that was cut off part way). */
  | "sending"
  /** In Click & Drop, waiting for the label to be paid for and printed. */
  | "sent"
  /** Click & Drop said no; nothing was created, so it can be sent again. */
  | "failed"
  /** Not sent automatically, e.g. an order going abroad. */
  | "skipped";

/** The Click & Drop record kept on each order (orders.royal_mail). Admin-only. */
export interface RoyalMailOrderRecord {
  status: RoyalMailStatus;
  startedAt: string;
  updatedAt: string;
  /** What went wrong, or what's left to do. */
  message?: string | null;
  /** Click & Drop's own order number. */
  orderIdentifier?: number;
  serviceCode?: string;
  serviceName?: string;
  weightGrams?: number;
  packageFormat?: RoyalMailPackageFormat;
  /** When the label was printed in Click & Drop. */
  printedAt?: string | null;
}

/** A send that started this long ago and never finished was cut off. */
export const STALE_SEND_MS = 5 * 60 * 1000;

export function isStaleSend(record: RoyalMailOrderRecord, now = Date.now()): boolean {
  return record.status === "sending" && now - Date.parse(record.startedAt) > STALE_SEND_MS;
}

/** Royal Mail's tracking page for a tracking number. */
export function royalMailTrackingUrl(trackingNumber: string): string {
  return `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`;
}

/** Click & Drop, where labels are paid for and printed. */
export const CLICK_AND_DROP_URL = "https://business.parcel.royalmail.com/";

/**
 * Tracking numbers ("MZ 5846 2566 0GB") are letters and digits; spaces and
 * dashes people copy along are dropped. Returns null for anything else.
 */
export function normalizeTrackingNumber(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  return /^[A-Z0-9]{4,60}$/.test(compact) ? compact : null;
}
