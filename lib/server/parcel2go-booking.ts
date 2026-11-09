import { randomUUID } from "node:crypto";
import {
  bookingSettingsProblems,
  defaultParcel2GoBookingSettings,
  isStaleBooking,
  type Parcel2GoBookingSettings,
  type Parcel2GoOrderBooking,
} from "@/lib/parcel2go-booking";
import { isExpressAvailable } from "@/lib/shipping";
import type { Order } from "@/lib/types";
import { getSupabaseAdmin } from "./supabase";
import { getServerOrderById } from "./order-store";
import {
  createParcel2GoOrder,
  parcel2GoConfigured,
  Parcel2GoRefusal,
  payParcel2GoWithPrepay,
  quoteParcel2Go,
} from "./parcel2go";

/**
 * Books paid orders' parcels on Parcel2Go: quote the chosen service, create
 * the order, then pay from the account's prepay balance so the label is
 * ready. Runs automatically for new UK orders when the admin has switched it
 * on (and from the daily check for any the first attempt missed), or when
 * the admin presses "Book with Parcel2Go" on an order.
 *
 * The booking is recorded on the order (orders.parcel2go_booking) and the
 * order is claimed before anything is sent, so one order is never booked
 * twice. The Parcel2Go number is saved as the order's parcel2go_reference,
 * which is what delivery tracking follows; the order switches to "shipped"
 * when the courier first scans the parcel (lib/server/delivery-tracking.ts).
 */

// The daily check only picks up orders this recent that were never tried.
const SWEEP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// ---------- Settings ----------

function text(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positive(value: unknown, fallback: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number * 100) / 100, max) : fallback;
}

/** Tidies settings from the admin form or the database, filling gaps with defaults. */
export function cleanBookingSettings(input: unknown): Parcel2GoBookingSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const sender = (raw.sender && typeof raw.sender === "object" ? raw.sender : {}) as Record<string, unknown>;
  const parcel = (raw.parcel && typeof raw.parcel === "object" ? raw.parcel : {}) as Record<string, unknown>;
  const defaults = defaultParcel2GoBookingSettings;
  const since = text(raw.autoBookSince, 40);

  return {
    autoBook: raw.autoBook === true,
    autoBookSince: since && Number.isFinite(Date.parse(since)) ? new Date(since).toISOString() : null,
    payWithPrepay: typeof raw.payWithPrepay === "boolean" ? raw.payWithPrepay : defaults.payWithPrepay,
    maxPriceGBP: positive(raw.maxPriceGBP, defaults.maxPriceGBP, 500),
    standardService: text(raw.standardService),
    standardServiceName: text(raw.standardServiceName, 200),
    expressService: text(raw.expressService),
    expressServiceName: text(raw.expressServiceName, 200),
    parcel: {
      weightKg: positive(parcel.weightKg, defaults.parcel.weightKg, 70),
      lengthCm: positive(parcel.lengthCm, defaults.parcel.lengthCm, 300),
      widthCm: positive(parcel.widthCm, defaults.parcel.widthCm, 300),
      heightCm: positive(parcel.heightCm, defaults.parcel.heightCm, 300),
    },
    sender: {
      name: text(sender.name, 80),
      company: typeof sender.company === "string" ? text(sender.company, 80) : defaults.sender.company,
      email: text(sender.email, 254),
      phone: text(sender.phone, 30),
      property: text(sender.property, 80),
      street: text(sender.street),
      town: text(sender.town, 80),
      county: text(sender.county, 80),
      postcode: text(sender.postcode, 12).toUpperCase(),
    },
  };
}

export async function getParcel2GoBookingSettings(): Promise<Parcel2GoBookingSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("store_settings")
    .select("parcel2go_booking")
    .eq("id", "default")
    .single();
  if (error) throw new Error(`Could not load the Parcel2Go settings: ${error.message}`);
  return cleanBookingSettings((data as { parcel2go_booking?: unknown } | null)?.parcel2go_booking);
}

/**
 * Saves the admin's settings. Automatic booking can only be switched on once
 * everything it needs is filled in, and switching it on starts the clock:
 * orders placed before then are never booked automatically.
 */
export async function saveParcel2GoBookingSettings(input: unknown, now = new Date()): Promise<Parcel2GoBookingSettings> {
  const previous = await getParcel2GoBookingSettings();
  const settings = cleanBookingSettings(input);
  if (settings.autoBook) {
    const problems = bookingSettingsProblems(settings);
    if (problems.length > 0) throw new Parcel2GoRefusal(`Automatic booking needs a few more details: ${problems.join(" ")}`);
  }
  settings.autoBookSince = settings.autoBook ? (previous.autoBook && previous.autoBookSince ? previous.autoBookSince : now.toISOString()) : null;

  const { error } = await getSupabaseAdmin().from("store_settings").update({ parcel2go_booking: settings }).eq("id", "default");
  if (error) throw new Error(`Could not save the Parcel2Go settings: ${error.message}`);
  return settings;
}

// ---------- Building the booking ----------

/** "12 Hagley Road" -> property "12", street "Hagley Road"; "Flat 4, 27 Lane" -> "Flat 4", "27 Lane". */
export function splitStreetLine(line: string): { property: string; street: string } {
  const value = line.trim().replace(/\s+/g, " ");
  const comma = value.indexOf(",");
  if (comma > 0) return { property: value.slice(0, comma).trim(), street: value.slice(comma + 1).trim() || value.slice(0, comma).trim() };
  const numbered = /^(\d+[a-zA-Z]?(?:-\d+[a-zA-Z]?)?)\s+(.+)$/.exec(value);
  if (numbered) return { property: numbered[1], street: numbered[2] };
  return { property: value, street: value };
}

function splitName(name: string): { forename: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  const forename = parts.shift() || "Toymak";
  return { forename, surname: parts.join(" ") || forename };
}

/** Why an order can't be booked here, or null when it can. */
export function bookingBlocker(order: Order): string | null {
  const address = order.shipping_address;
  if (!isExpressAvailable(address?.country ?? "")) return "Going abroad needs customs details, so book this one on parcel2go.com.";
  if (!address?.street?.trim() || !address.city?.trim() || !address.postalCode?.trim()) return "The delivery address is incomplete.";
  return null;
}

export function serviceForOrder(order: Order, settings: Parcel2GoBookingSettings): { slug: string; name: string } {
  if (order.shipping_address?.shippingMethod === "express" && settings.expressService) {
    return { slug: settings.expressService, name: settings.expressServiceName || settings.expressService };
  }
  return { slug: settings.standardService, name: settings.standardServiceName || settings.standardService };
}

/** The order as Parcel2Go's POST /orders wants it. */
export function buildParcel2GoOrder(
  order: Order,
  settings: Parcel2GoBookingSettings,
  service: string,
  collectionDate: string | null | undefined,
  ids: { item: string; parcel: string } = { item: randomUUID(), parcel: randomUUID() },
) {
  const address = order.shipping_address;
  const delivery = splitStreetLine(address.street);
  const sender = settings.sender;
  const { forename, surname } = splitName(sender.name);
  const contents = order.items.map((item) => `${item.quantity} x ${item.product_name}`).join(", ");

  return {
    Items: [{
      Id: ids.item,
      CollectionDate: collectionDate || undefined,
      OriginCountry: "GBR",
      Service: service,
      Reference: order.tracking_id,
      CollectionAddress: {
        ContactName: sender.name,
        Organisation: sender.company || undefined,
        Email: sender.email,
        Phone: sender.phone,
        Property: sender.property,
        Street: sender.street,
        Town: sender.town,
        County: sender.county || undefined,
        Postcode: sender.postcode,
        CountryIsoCode: "GBR",
      },
      Parcels: [{
        Id: ids.parcel,
        Weight: settings.parcel.weightKg,
        Length: settings.parcel.lengthCm,
        Width: settings.parcel.widthCm,
        Height: settings.parcel.heightCm,
        EstimatedValue: Math.max(1, Math.round(order.subtotal * 100) / 100),
        ContentsSummary: (contents || "Clothing").slice(0, 100),
        DeliveryAddress: {
          ContactName: order.customer_name || address.fullName,
          Email: order.customer_email || address.email,
          Phone: order.customer_phone || address.phone || undefined,
          Property: delivery.property,
          Street: delivery.street,
          Town: address.city.trim(),
          County: address.state?.trim() || undefined,
          Postcode: address.postalCode.trim().toUpperCase(),
          CountryIsoCode: "GBR",
        },
      }],
    }],
    CustomerDetails: { Email: sender.email, Forename: forename, Surname: surname },
  };
}

// ---------- Booking ----------

async function saveBooking(orderId: string, booking: Parcel2GoOrderBooking, extra: Record<string, unknown> = {}) {
  const { error } = await getSupabaseAdmin().from("orders").update({ parcel2go_booking: booking, ...extra }).eq("id", orderId);
  if (error) throw new Error(`Could not save the Parcel2Go booking for order ${orderId}: ${error.message}`);
}

/**
 * Claims the order for booking, so a second attempt running at the same
 * time (a webhook retry, a double click) books nothing. Only succeeds while
 * the order's booking is exactly what this attempt saw.
 */
async function claimOrder(order: Order, booking: Parcel2GoOrderBooking): Promise<boolean> {
  const previous = order.parcel2go_booking ?? null;
  let query = getSupabaseAdmin()
    .from("orders")
    .update({ parcel2go_booking: booking })
    .eq("id", order.id)
    .eq("status", "unshipped")
    .is("parcel2go_reference", null);
  query = previous
    ? query.eq("parcel2go_booking->>status", previous.status).eq("parcel2go_booking->>startedAt", previous.startedAt)
    : query.is("parcel2go_booking", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(`Could not start the Parcel2Go booking for order ${order.id}: ${error.message}`);
  return Boolean(data);
}

export type BookingOutcome = { order: Order; error?: string };

/** Pays for a booking already created on Parcel2Go, from the prepay balance. */
async function payForBooking(orderId: string, booking: Parcel2GoOrderBooking, now: () => string): Promise<Parcel2GoOrderBooking> {
  try {
    const result = await payParcel2GoWithPrepay(booking.orderId!, booking.hash);
    if (result.paid) return { ...booking, status: "booked", updatedAt: now(), message: null, payUrl: null, documents: result.documents };
    return { ...booking, updatedAt: now(), message: `Not paid: ${result.reason}` };
  } catch (error) {
    console.error(`Parcel2Go prepay payment for order ${orderId} failed:`, error);
    return { ...booking, updatedAt: now(), message: "Parcel2Go didn't confirm the payment. Check your Parcel2Go account before paying again." };
  }
}

/**
 * Books the order's parcel on Parcel2Go. "manual" is the admin pressing the
 * button: it retries a failed or cut-off booking, and pays for one that's
 * waiting for payment. "auto" books a new order once and leaves anything
 * unusual (an order going abroad, a failure) for the admin.
 */
export async function bookOrderOnParcel2Go(
  orderId: string,
  trigger: "auto" | "manual",
  clock: () => Date = () => new Date(),
): Promise<BookingOutcome> {
  const now = () => clock().toISOString();
  const order = await getServerOrderById(orderId);
  if (!order) throw new Parcel2GoRefusal("Order not found.");
  if (!parcel2GoConfigured()) return { order, error: "Parcel2Go isn't connected (PARCEL2GO_CLIENT_ID / PARCEL2GO_CLIENT_SECRET)." };

  const existing = order.parcel2go_booking ?? null;

  // Already on Parcel2Go but unpaid: the button pays for it.
  if (existing?.status === "awaiting_payment") {
    if (trigger !== "manual" || !existing.orderId) return { order };
    const paid = await payForBooking(order.id, existing, now);
    await saveBooking(order.id, paid);
    return { order: { ...order, parcel2go_booking: paid }, error: paid.status === "booked" ? undefined : paid.message ?? undefined };
  }
  if (existing?.status === "booked") return { order };
  if (order.status !== "unshipped" || order.parcel2go_reference) {
    return { order, error: "This order already has a Parcel2Go or courier number." };
  }
  if (existing?.status === "booking" && !isStaleBooking(existing, clock().getTime())) {
    return { order, error: "This order is being booked right now." };
  }
  if (existing && trigger === "auto") return { order };

  const blocker = bookingBlocker(order);
  const settings = await getParcel2GoBookingSettings();
  const problems = bookingSettingsProblems(settings);
  if (blocker || problems.length > 0) {
    const message = blocker ?? `Finish the Parcel2Go settings first: ${problems.join(" ")}`;
    if (trigger === "auto" && !existing) {
      const skipped: Parcel2GoOrderBooking = { status: blocker ? "skipped" : "failed", startedAt: now(), updatedAt: now(), message };
      if (await claimOrder(order, skipped)) return { order: { ...order, parcel2go_booking: skipped }, error: message };
    }
    return { order, error: message };
  }

  const service = serviceForOrder(order, settings);
  const started: Parcel2GoOrderBooking = { status: "booking", startedAt: now(), updatedAt: now(), service: service.slug, serviceName: service.name };
  if (!(await claimOrder(order, started))) {
    const latest = await getServerOrderById(order.id);
    return { order: latest ?? order, error: "This order was just booked or changed. Refresh to see it." };
  }

  // 1. Quote, which also checks Parcel2Go will take this parcel today.
  // 2. Create the order on Parcel2Go.
  let created;
  let price: number;
  try {
    const address = order.shipping_address;
    const quotes = await quoteParcel2Go({
      service: service.slug,
      collection: { Country: "GBR", Postcode: settings.sender.postcode, Town: settings.sender.town, Property: settings.sender.property },
      delivery: { Country: "GBR", Postcode: address.postalCode.trim(), Town: address.city.trim(), Property: splitStreetLine(address.street).property },
      parcel: { value: Math.max(1, order.subtotal), ...settings.parcel },
    });
    const quote = quotes.find((candidate) => candidate.Service?.Slug === service.slug);
    if (!quote) throw new Parcel2GoRefusal(`Parcel2Go won't take this parcel on ${service.name} right now (check the parcel size and weight, or pick another service).`);
    price = quote.TotalPrice;
    created = await createParcel2GoOrder(buildParcel2GoOrder(order, settings, service.slug, quote.Collection));
  } catch (error) {
    const refused = error instanceof Parcel2GoRefusal;
    const message = error instanceof Error ? error.message : "Unknown error.";
    // A refusal created nothing, so it can simply be tried again. Anything
    // else (a timeout) may have created the order: leave it marked as
    // booking so nobody books it twice without checking Parcel2Go first.
    const booking: Parcel2GoOrderBooking = refused
      ? { ...started, status: "failed", updatedAt: now(), message }
      : { ...started, updatedAt: now(), message: `Parcel2Go didn't confirm the booking (${message}). Check your Parcel2Go account before booking again.` };
    await saveBooking(order.id, booking);
    if (!refused) console.error(`Parcel2Go booking for order ${order.id} is unconfirmed:`, error);
    return { order: { ...order, parcel2go_booking: booking }, error: booking.message ?? undefined };
  }

  const line = created.OrderlineIdMap?.[0];
  const reference = `P2G${line?.OrderLineId ?? created.OrderId}`;
  let booking: Parcel2GoOrderBooking = {
    ...started,
    status: "awaiting_payment",
    updatedAt: now(),
    orderId: created.OrderId,
    orderLineId: line?.OrderLineId,
    hash: created.Hash,
    price: created.TotalPrice ?? price,
    payUrl: created.Links?.payment ?? null,
    message: null,
  };
  // Saved before paying, so the booking is never lost if payment goes wrong.
  const referenceFields = { parcel2go_reference: reference, delivery_tracking: null, delivery_notified_stage: null };
  await saveBooking(order.id, booking, referenceFields);

  // 3. Pay from the prepay balance, unless that's switched off or it costs more than allowed.
  if (!settings.payWithPrepay) {
    booking = { ...booking, message: "Pay for it on Parcel2Go to get the label." };
  } else if ((booking.price ?? 0) > settings.maxPriceGBP) {
    booking = { ...booking, message: `Costs £${booking.price!.toFixed(2)}, above your £${settings.maxPriceGBP.toFixed(2)} limit for automatic payment. Pay for it here or on Parcel2Go.` };
  } else {
    booking = await payForBooking(order.id, booking, now);
  }
  await saveBooking(order.id, booking);

  const updated: Order = { ...order, parcel2go_reference: reference, delivery: null, delivery_notified_stage: null, parcel2go_booking: booking };
  return { order: updated, error: booking.status === "booked" ? undefined : booking.message ?? undefined };
}

/** For a newly paid order: books it if automatic booking is on. Never throws. */
export async function autoBookParcel2Go(order: Order): Promise<void> {
  try {
    if (!parcel2GoConfigured()) return;
    const settings = await getParcel2GoBookingSettings();
    if (!settings.autoBook || !settings.autoBookSince) return;
    if (new Date(order.created_at).getTime() < Date.parse(settings.autoBookSince)) return;
    await bookOrderOnParcel2Go(order.id, "auto");
  } catch (error) {
    console.error(`Automatic Parcel2Go booking for order ${order.id} failed:`, error);
  }
}

/** The daily check: books recent orders that automatic booking never got to. */
export async function sweepParcel2GoBookings(now = Date.now()): Promise<{ tried: number; booked: number }> {
  if (!parcel2GoConfigured()) return { tried: 0, booked: 0 };
  const settings = await getParcel2GoBookingSettings();
  if (!settings.autoBook || !settings.autoBookSince) return { tried: 0, booked: 0 };

  const since = new Date(Math.max(Date.parse(settings.autoBookSince), now - SWEEP_WINDOW_MS)).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .eq("status", "unshipped")
    .is("parcel2go_booking", null)
    .is("parcel2go_reference", null)
    .gte("created_at", since);
  if (error) throw new Error(`Could not load orders to book: ${error.message}`);

  let tried = 0, booked = 0;
  for (const { id } of data ?? []) {
    tried++;
    try {
      const { order } = await bookOrderOnParcel2Go(id, "auto");
      if (order.parcel2go_booking?.status === "booked") booked++;
    } catch (error) {
      console.error(`Parcel2Go booking for order ${id} failed:`, error);
    }
  }
  return { tried, booked };
}
