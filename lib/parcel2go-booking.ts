/**
 * Booking parcels on Parcel2Go for paid orders: the admin's booking settings
 * and the booking record kept on each order. Shared by the server
 * (lib/server/parcel2go-booking.ts) and the admin pages.
 */

export interface Parcel2GoSender {
  name: string;
  company: string;
  email: string;
  phone: string;
  /** House number or name, e.g. "12". Blank: taken from the start of `street`. */
  property: string;
  /** The first address line, e.g. "12 Broad Street". */
  street: string;
  town: string;
  county: string;
  postcode: string;
}

export interface Parcel2GoParcelSize {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Parcel2GoBookingSettings {
  /** Book every new paid UK order as soon as it comes in. */
  autoBook: boolean;
  /** When autoBook was last switched on: older orders are never booked automatically. */
  autoBookSince: string | null;
  /** Pay from the Parcel2Go prepay balance; otherwise the order waits for payment on parcel2go.com. */
  payWithPrepay: boolean;
  /** Bookings dearer than this are left for the admin to pay by hand. */
  maxPriceGBP: number;
  /** Blank: the cheapest drop-off service that delivers to the door, chosen per order. */
  standardService: string;
  standardServiceName: string;
  /** Blank: the cheapest fast drop-off service, chosen per order. */
  expressService: string;
  expressServiceName: string;
  parcel: Parcel2GoParcelSize;
  sender: Parcel2GoSender;
}

export const defaultParcel2GoBookingSettings: Parcel2GoBookingSettings = {
  autoBook: false,
  autoBookSince: null,
  payWithPrepay: true,
  maxPriceGBP: 15,
  standardService: "",
  standardServiceName: "",
  expressService: "",
  expressServiceName: "",
  parcel: { weightKg: 0.5, lengthCm: 30, widthCm: 20, heightCm: 5 },
  sender: { name: "", company: "Toymak Fashion", email: "", phone: "", property: "", street: "", town: "", county: "", postcode: "" },
};

/** What still has to be filled in before anything can be booked. */
export function bookingSettingsProblems(settings: Parcel2GoBookingSettings): string[] {
  const problems: string[] = [];
  const { sender, parcel } = settings;
  if (!sender.name.trim()) problems.push("Add your name.");
  if (!sender.phone.trim()) problems.push("Add a phone number.");
  if (!/^\S+@\S+\.\S+$/.test(sender.email.trim())) problems.push("Add an email.");
  if (!sender.street.trim() || !sender.town.trim() || !sender.postcode.trim()) problems.push("Add the address, town and postcode.");
  if (!(parcel.weightKg > 0) || !(parcel.lengthCm > 0) || !(parcel.widthCm > 0) || !(parcel.heightCm > 0)) {
    problems.push("Set the parcel's weight and size.");
  }
  return problems;
}

/** Parcel2Go's public tracking page for a P2G number (or courier number). */
export function parcel2GoTrackingUrl(reference: string): string {
  return `https://www.parcel2go.com/tracking/${encodeURIComponent(reference)}`;
}

export type Parcel2GoBookingStatus =
  /** Being booked right now (or a booking that was cut off part way). */
  | "booking"
  /** Booked and paid: labels are ready. */
  | "booked"
  /** Created on Parcel2Go but not paid yet. */
  | "awaiting_payment"
  /** Nothing was created on Parcel2Go; safe to try again. */
  | "failed"
  /** Not booked automatically, e.g. an order going abroad. */
  | "skipped";

export interface Parcel2GoBookingDocument {
  name: string;
  url: string;
}

/** The booking record kept on each order (orders.parcel2go_booking). */
export interface Parcel2GoOrderBooking {
  status: Parcel2GoBookingStatus;
  startedAt: string;
  updatedAt: string;
  /** What went wrong, or why it still needs paying. */
  message?: string | null;
  orderId?: string;
  orderLineId?: string;
  hash?: string;
  service?: string;
  serviceName?: string;
  /** What Parcel2Go charges, including VAT. */
  price?: number;
  /** Pay for an unpaid booking on parcel2go.com. */
  payUrl?: string | null;
  /** Labels and other documents, once paid. */
  documents?: Parcel2GoBookingDocument[];
}

/** A booking that started this long ago and never finished was cut off. */
export const STALE_BOOKING_MS = 5 * 60 * 1000;

export function isStaleBooking(booking: Parcel2GoOrderBooking, now = Date.now()): boolean {
  return booking.status === "booking" && now - Date.parse(booking.startedAt) > STALE_BOOKING_MS;
}

const documentLabels: Record<string, string> = {
  "labels-a4": "Label (A4)",
  "labels-4x6": "Label (4×6)",
  "labels-a4-4x6": "Label (4×6 on A4)",
  "barcode-printinstore": "Print-in-store barcode",
  "picking-list": "Picking list",
  invoice: "Invoice",
};

export function bookingDocumentLabel(name: string): string {
  return documentLabels[name.toLowerCase()] ?? name;
}
