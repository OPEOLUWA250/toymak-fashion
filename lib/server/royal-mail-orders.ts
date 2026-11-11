import {
  defaultRoyalMailSettings,
  defaultServiceLabels,
  isStaleSend,
  normalizeTrackingNumber,
  packageFormatFor,
  packageFormats,
  type RoyalMailOrderRecord,
  type RoyalMailPackageFormat,
  type RoyalMailSettings,
} from "@/lib/royal-mail";
import { isExpressAvailable } from "@/lib/shipping";
import type { Order } from "@/lib/types";
import { getSupabaseAdmin } from "./supabase";
import { getServerOrderById } from "./order-store";
import {
  createRoyalMailOrder,
  getRoyalMailOrders,
  listRoyalMailServices,
  pickTrackedService,
  royalMailConfigured,
  RoyalMailRefusal,
  type RoyalMailOrderInfo,
  type RoyalMailService,
} from "./royal-mail";
import { sendShippedEmail } from "./shipped-email";

/**
 * Ships paid orders with Royal Mail Click & Drop.
 *
 * 1. Sending: each new paid UK order is created in Click & Drop with Royal
 *    Mail Tracked 48 (standard) or Tracked 24 (express) chosen, its weight
 *    and its items (automatically when Settings -> Royal Mail says so, from
 *    the daily check for any that were missed, or from the order's button).
 *    The order is claimed first, so it's never sent twice.
 * 2. The admin pays for and prints the label in Click & Drop.
 * 3. Tracking: the store asks Click & Drop for the tracking number when the
 *    admin's order list loads, when the customer opens Track Order and in
 *    the daily check. Once there is one the order turns "shipped" and the
 *    customer is emailed it (once). Royal Mail itself tells the customer
 *    when it's out for delivery and delivered.
 */

// The daily check only sends orders this recent that were never tried.
const SEND_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// Orders waiting this long for a label in Click & Drop need a person, not polling.
const FOLLOW_FOR_MS = 30 * 24 * 60 * 60 * 1000;
// Shipped orders whose email failed are retried for this long.
const EMAIL_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

// ---------- Settings ----------

function text(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Tidies settings from the admin form or the database, filling gaps with defaults. */
export function cleanRoyalMailSettings(input: unknown): RoyalMailSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const defaults = defaultRoyalMailSettings;
  const weight = Number(raw.fallbackWeightKg);
  const format = raw.packageFormat as RoyalMailPackageFormat;
  return {
    autoSend: typeof raw.autoSend === "boolean" ? raw.autoSend : defaults.autoSend,
    standardService: text(raw.standardService, 10),
    standardServiceName: text(raw.standardServiceName, 200),
    expressService: text(raw.expressService, 10),
    expressServiceName: text(raw.expressServiceName, 200),
    packageFormat: Object.hasOwn(packageFormats, format) ? format : defaults.packageFormat,
    fallbackWeightKg: Number.isFinite(weight) && weight > 0 ? Math.min(Math.round(weight * 1000) / 1000, 20) : defaults.fallbackWeightKg,
  };
}

export async function getRoyalMailSettings(): Promise<RoyalMailSettings> {
  const { data, error } = await getSupabaseAdmin().from("store_settings").select("royal_mail").eq("id", "default").single();
  if (error) throw new Error(`Could not load the Royal Mail settings: ${error.message}`);
  return cleanRoyalMailSettings((data as { royal_mail?: unknown } | null)?.royal_mail);
}

export async function saveRoyalMailSettings(input: unknown): Promise<RoyalMailSettings> {
  const settings = cleanRoyalMailSettings(input);
  const { error } = await getSupabaseAdmin().from("store_settings").update({ royal_mail: settings }).eq("id", "default");
  if (error) throw new Error(`Could not save the Royal Mail settings: ${error.message}`);
  return settings;
}

// ---------- Building the Click & Drop order ----------

/** The parcel's weight: each item's weight times its quantity, in grams. */
export function parcelGrams(order: Order, fallbackKg: number): number {
  const kg = order.items.reduce((sum, item) => sum + (item.weight_kg ?? fallbackKg) * item.quantity, 0);
  return Math.min(30000, Math.max(1, Math.round((kg || fallbackKg) * 1000)));
}

const money = (value: number) => Math.max(0, Math.round((Number(value) || 0) * 100) / 100);

/** The order as Click & Drop's POST /orders wants it. */
export function buildRoyalMailOrder(
  order: Order,
  service: RoyalMailService | null,
  grams: number,
  format: RoyalMailPackageFormat,
  fallbackKg: number,
) {
  const address = order.shipping_address;
  const phone = (order.customer_phone || address.phone || "").trim().slice(0, 25);
  const email = (order.customer_email || address.email || "").trim();
  return {
    orderReference: order.tracking_id.slice(0, 40),
    orderDate: new Date(order.created_at).toISOString(),
    recipient: {
      address: {
        fullName: (address.fullName || order.customer_name).trim().slice(0, 210),
        addressLine1: address.street.trim().slice(0, 100),
        city: address.city.trim().slice(0, 100),
        county: address.state?.trim().slice(0, 100) || undefined,
        postcode: address.postalCode.trim().toUpperCase().slice(0, 20),
        countryCode: "GBR",
      },
      phoneNumber: phone || undefined,
      emailAddress: email || undefined,
    },
    packages: [{
      weightInGrams: grams,
      packageFormatIdentifier: format,
      contents: order.items.map((item) => ({
        name: `${item.product_name} (${item.size}, ${item.color})`.slice(0, 800),
        quantity: item.quantity,
        unitValue: money(item.unit_price),
        unitWeightInGrams: Math.round((item.weight_kg ?? fallbackKg) * 1000),
      })),
    }],
    subtotal: money(order.subtotal),
    shippingCostCharged: money(order.shipping_cost),
    total: money(order.total_amount),
    currencyCode: order.currency,
    postageDetails: {
      ...(service ? { serviceCode: service.code } : {}),
      // Royal Mail emails (and texts) the customer as the parcel moves.
      sendNotificationsTo: "recipient",
      receiveEmailNotification: Boolean(email),
      receiveSmsNotification: Boolean(phone),
    },
  };
}

/** Why this order can't go to Click & Drop automatically, or null when it can. */
export function sendBlocker(order: Order): string | null {
  const address = order.shipping_address;
  if (!isExpressAvailable(address?.country ?? "")) return "Orders going abroad need customs details, so create this one in Click & Drop yourself.";
  if (!address?.street?.trim() || !address.city?.trim() || !address.postalCode?.trim()) return "The delivery address is incomplete.";
  return null;
}

// ---------- Sending ----------

async function saveRecord(orderId: string, record: RoyalMailOrderRecord) {
  const { error } = await getSupabaseAdmin().from("orders").update({ royal_mail: record }).eq("id", orderId);
  if (error) throw new Error(`Could not save the Royal Mail details for order ${orderId}: ${error.message}`);
}

/**
 * Claims the order, so a second attempt running at the same time (a webhook
 * retry, a double click) sends nothing. Only succeeds while the order's
 * record is exactly what this attempt saw.
 */
async function claimOrder(order: Order, record: RoyalMailOrderRecord): Promise<boolean> {
  const previous = order.royal_mail ?? null;
  let query = getSupabaseAdmin()
    .from("orders")
    .update({ royal_mail: record })
    .eq("id", order.id)
    .eq("status", "unshipped")
    .is("tracking_number", null);
  query = previous
    ? query.eq("royal_mail->>status", previous.status).eq("royal_mail->>startedAt", previous.startedAt)
    : query.is("royal_mail", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(`Could not start sending order ${order.id} to Royal Mail: ${error.message}`);
  return Boolean(data);
}

export type SendOutcome = { order: Order; error?: string };

async function chooseService(order: Order, settings: RoyalMailSettings, grams: number): Promise<RoyalMailService | null> {
  const express = order.shipping_address?.shippingMethod === "express";
  const [code, name] = express
    ? [settings.expressService, settings.expressServiceName]
    : [settings.standardService, settings.standardServiceName];
  if (code) return { code, name: name || code };
  try {
    const services = await listRoyalMailServices({ postcode: order.shipping_address.postalCode.trim(), grams });
    return pickTrackedService(services, express) ?? null;
  } catch (error) {
    console.error(`Could not list Royal Mail services for order ${order.id}:`, error);
    return null;
  }
}

/**
 * Sends the order to Click & Drop. "manual" is the admin pressing the
 * button: it retries a failed or cut-off send. "auto" sends a new order once
 * and leaves anything unusual (an order going abroad, a failure) for the admin.
 */
export async function sendOrderToRoyalMail(
  orderId: string,
  trigger: "auto" | "manual",
  clock: () => Date = () => new Date(),
): Promise<SendOutcome> {
  const now = () => clock().toISOString();
  const order = await getServerOrderById(orderId);
  if (!order) throw new RoyalMailRefusal("Order not found.");
  if (!royalMailConfigured()) return { order, error: "Royal Mail isn't connected yet (ROYAL_MAIL_API_KEY)." };

  const existing = order.royal_mail ?? null;
  if (existing?.status === "sent") return { order };
  if (order.status !== "unshipped" || order.tracking_number) return { order, error: "This order already has a tracking number." };
  if (existing?.status === "sending" && !isStaleSend(existing, clock().getTime())) {
    return { order, error: "This order is being sent to Click & Drop right now." };
  }
  if (existing && trigger === "auto") return { order };

  const blocker = sendBlocker(order);
  if (blocker) {
    if (trigger === "auto") {
      const skipped: RoyalMailOrderRecord = { status: "skipped", startedAt: now(), updatedAt: now(), message: blocker };
      if (await claimOrder(order, skipped)) return { order: { ...order, royal_mail: skipped }, error: blocker };
    }
    return { order, error: blocker };
  }

  // A send that was cut off may still have reached Click & Drop: look for it first.
  if (existing?.status === "sending") {
    let found: RoyalMailOrderInfo | undefined;
    try {
      [found] = await getRoyalMailOrders([order.tracking_id]);
    } catch (error) {
      return { order, error: `Couldn't check Click & Drop for this order first: ${error instanceof Error ? error.message : "unknown error"}` };
    }
    if (found) {
      const adopted: RoyalMailOrderRecord = { ...existing, status: "sent", updatedAt: now(), orderIdentifier: found.orderIdentifier, message: null };
      if (!(await claimOrder(order, adopted))) return { order: (await getServerOrderById(order.id)) ?? order, error: "This order was just changed. Refresh to see it." };
      return { order: { ...order, royal_mail: adopted } };
    }
  }

  const settings = await getRoyalMailSettings();
  const grams = parcelGrams(order, settings.fallbackWeightKg);
  const format = packageFormatFor(grams, settings.packageFormat);
  const started: RoyalMailOrderRecord = { status: "sending", startedAt: now(), updatedAt: now(), weightGrams: grams, packageFormat: format };
  if (!(await claimOrder(order, started))) {
    return { order: (await getServerOrderById(order.id)) ?? order, error: "This order was just sent or changed. Refresh to see it." };
  }

  const express = order.shipping_address.shippingMethod === "express";
  const wanted = defaultServiceLabels[express ? "express" : "standard"];
  let service = await chooseService(order, settings, grams);
  let note: string | null = service ? null : `Choose ${wanted} for it in Click & Drop.`;
  let record: RoyalMailOrderRecord;
  try {
    let created: RoyalMailOrderInfo;
    try {
      created = await createRoyalMailOrder(buildRoyalMailOrder(order, service, grams, format, settings.fallbackWeightKg));
    } catch (error) {
      // Royal Mail turned the service down for this parcel: still get the
      // order into Click & Drop, where a service can be picked by hand.
      if (!(error instanceof RoyalMailRefusal) || !service) throw error;
      created = await createRoyalMailOrder(buildRoyalMailOrder(order, null, grams, format, settings.fallbackWeightKg));
      note = `Royal Mail wouldn't take ${service.name} for this parcel (${error.message}). Choose a service for it in Click & Drop.`;
      service = null;
    }
    record = {
      ...started,
      status: "sent",
      updatedAt: now(),
      orderIdentifier: created.orderIdentifier,
      serviceCode: service?.code,
      serviceName: service?.name,
      message: note,
    };
    await saveRecord(order.id, record);
    // Accounts that buy labels automatically get the tracking number at once.
    const trackingNumber = created.trackingNumber ? normalizeTrackingNumber(created.trackingNumber) : null;
    if (trackingNumber) {
      const shipped = await markShipped({ ...order, royal_mail: record }, trackingNumber, created.printedOn ?? null, clock);
      if (shipped) {
        await notifyShipped(shipped);
        return { order: shipped };
      }
    }
  } catch (error) {
    const refused = error instanceof RoyalMailRefusal;
    const message = error instanceof Error ? error.message : "Unknown error.";
    // A refusal created nothing, so it can simply be sent again. Anything
    // else (a timeout) may have created it: leave it marked as sending, and
    // Click & Drop is checked for it before it's ever sent again.
    record = refused
      ? { ...started, status: "failed", updatedAt: now(), message }
      : { ...started, updatedAt: now(), message: `Click & Drop didn't confirm this order (${message}). It's checked for there before being sent again.` };
    await saveRecord(order.id, record);
    if (!refused) console.error(`Sending order ${order.id} to Royal Mail is unconfirmed:`, error);
    return { order: { ...order, royal_mail: record }, error: record.message ?? undefined };
  }
  return { order: { ...order, royal_mail: record }, error: note ?? undefined };
}

/** For a newly paid order: sends it if automatic sending is on. Never throws. */
export async function autoSendToRoyalMail(order: Order): Promise<void> {
  try {
    if (!royalMailConfigured()) return;
    if (!(await getRoyalMailSettings()).autoSend) return;
    await sendOrderToRoyalMail(order.id, "auto");
  } catch (error) {
    console.error(`Sending order ${order.id} to Royal Mail failed:`, error);
  }
}

/** The daily check: sends recent orders that automatic sending never got to. */
export async function sweepRoyalMailSends(now = Date.now()): Promise<{ tried: number; sent: number }> {
  if (!royalMailConfigured() || !(await getRoyalMailSettings()).autoSend) return { tried: 0, sent: 0 };
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .eq("status", "unshipped")
    .is("royal_mail", null)
    .is("tracking_number", null)
    .gte("created_at", new Date(now - SEND_WINDOW_MS).toISOString());
  if (error) throw new Error(`Could not load orders to send: ${error.message}`);

  let tried = 0, sent = 0;
  for (const { id } of (data ?? []) as { id: string }[]) {
    tried++;
    try {
      const { order } = await sendOrderToRoyalMail(id, "auto");
      if (order.royal_mail?.status === "sent") sent++;
    } catch (error) {
      console.error(`Sending order ${id} to Royal Mail failed:`, error);
    }
  }
  return { tried, sent };
}

// ---------- Tracking numbers ----------

/** In Click & Drop and waiting for its label to be printed. */
export function awaitingLabel(order: Order): boolean {
  return order.status === "unshipped" && !order.tracking_number
    && order.royal_mail?.status === "sent" && typeof order.royal_mail.orderIdentifier === "number";
}

function validTime(value: string | null | undefined): string | null {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) && new Date(time).getUTCFullYear() > 2000 ? new Date(time).toISOString() : null;
}

/** Saves the tracking number and marks the order shipped, unless something else already did. */
async function markShipped(order: Order, trackingNumber: string, printedOn: string | null, clock: () => Date = () => new Date()): Promise<Order | null> {
  const record: RoyalMailOrderRecord = { ...order.royal_mail!, updatedAt: clock().toISOString(), printedAt: validTime(printedOn) ?? clock().toISOString(), message: null };
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update({ tracking_number: trackingNumber, status: "shipped", royal_mail: record })
    .eq("id", order.id)
    .eq("status", "unshipped")
    .is("tracking_number", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not save the tracking number for order ${order.id}: ${error.message}`);
  return data ? { ...order, tracking_number: trackingNumber, status: "shipped", royal_mail: record } : null;
}

/**
 * Asks Click & Drop for the tracking numbers of the orders waiting for a
 * label, in one request. Returns every order as it now stands, and the ones
 * that just shipped (their customers still need emailing: see notifyShipped).
 */
export async function syncRoyalMailTracking(orders: Order[]): Promise<{ orders: Order[]; shipped: Order[] }> {
  const waiting = orders.filter(awaitingLabel);
  if (waiting.length === 0 || !royalMailConfigured()) return { orders, shipped: [] };

  const found = new Map((await getRoyalMailOrders(waiting.map((order) => order.royal_mail!.orderIdentifier!)))
    .map((info) => [info.orderIdentifier, info]));
  const shipped: Order[] = [];
  for (const order of waiting) {
    const info = found.get(order.royal_mail!.orderIdentifier!);
    const trackingNumber = info?.trackingNumber ? normalizeTrackingNumber(info.trackingNumber) : null;
    if (!trackingNumber) continue;
    const updated = await markShipped(order, trackingNumber, info?.printedOn ?? info?.shippedOn ?? null);
    if (updated) shipped.push(updated);
  }
  const byId = new Map(shipped.map((order) => [order.id, order]));
  return { orders: orders.map((order) => byId.get(order.id) ?? order), shipped };
}

// The admin's order list reloads every minute while it's open; Click & Drop
// is asked at most this often per server for those reloads.
const LIST_SYNC_EVERY_MS = 60_000;
let lastListSync = 0;

/**
 * syncRoyalMailTracking for a page that's waiting: gives up waiting after
 * `waitMs` (the check carries on, and the daily check emails anyone it
 * shipped) and never throws. `throttled` is for the admin's order list.
 */
export async function syncRoyalMailTrackingQuickly(
  orders: Order[],
  { waitMs = 6000, throttled = false }: { waitMs?: number; throttled?: boolean } = {},
): Promise<{ orders: Order[]; shipped: Order[] }> {
  const unchanged = { orders, shipped: [] as Order[] };
  if (!orders.some(awaitingLabel) || !royalMailConfigured()) return unchanged;
  if (throttled) {
    if (Date.now() - lastListSync < LIST_SYNC_EVERY_MS) return unchanged;
    lastListSync = Date.now();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof unchanged>((resolve) => { timer = setTimeout(() => resolve(unchanged), waitMs); });
  try {
    return await Promise.race([
      syncRoyalMailTracking(orders).catch((error) => {
        console.error("Checking Royal Mail for tracking numbers failed:", error);
        return unchanged;
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The order's button once it's in Click & Drop: checks for its tracking
 * number now. If Click & Drop no longer has the order (deleted there), it
 * can be sent again.
 */
export async function checkRoyalMailOrder(orderId: string, clock: () => Date = () => new Date()): Promise<SendOutcome> {
  const order = await getServerOrderById(orderId);
  if (!order) throw new RoyalMailRefusal("Order not found.");
  if (!awaitingLabel(order)) return { order };
  if (!royalMailConfigured()) return { order, error: "Royal Mail isn't connected (ROYAL_MAIL_API_KEY)." };

  const [info] = await getRoyalMailOrders([order.royal_mail!.orderIdentifier!]);
  if (!info) {
    const gone: RoyalMailOrderRecord = {
      ...order.royal_mail!,
      status: "failed",
      updatedAt: clock().toISOString(),
      message: "Click & Drop no longer has this order (was it deleted there?). Send it again if it still needs a label.",
    };
    await saveRecord(order.id, gone);
    return { order: { ...order, royal_mail: gone }, error: gone.message ?? undefined };
  }
  const trackingNumber = info.trackingNumber ? normalizeTrackingNumber(info.trackingNumber) : null;
  if (!trackingNumber) return { order, error: "No label yet. Pay for and print it in Click & Drop, then check again." };
  const shipped = await markShipped(order, trackingNumber, info.printedOn ?? info.shippedOn ?? null, clock);
  if (!shipped) return { order: (await getServerOrderById(order.id)) ?? order };
  await notifyShipped(shipped);
  return { order: (await getServerOrderById(order.id)) ?? shipped };
}

// ---------- Telling the customer ----------

/** Shipped with a way to follow it, and not emailed about it yet. */
export function shippedEmailDue(order: Order): boolean {
  return order.status === "shipped" && Boolean(order.tracking_number || order.tracking_link) && !order.shipped_email_sent_at;
}

/**
 * Emails the customer their tracking number, once. The order is claimed in
 * the database first, so two checks running at the same moment can't both
 * send; a failed send releases it for the next check.
 */
export async function notifyShipped(order: Order): Promise<boolean> {
  if (!shippedEmailDue(order)) return false;
  const sentAt = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update({ shipped_email_sent_at: sentAt })
    .eq("id", order.id)
    .is("shipped_email_sent_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return false;

  if (await sendShippedEmail(order).catch(() => false)) return true;
  await getSupabaseAdmin().from("orders").update({ shipped_email_sent_at: null }).eq("id", order.id).eq("shipped_email_sent_at", sentAt);
  return false;
}

function ids(result: { data: unknown; error: { message: string } | null }): string[] {
  if (result.error) throw new Error(`Could not load orders: ${result.error.message}`);
  return ((result.data ?? []) as { id: string }[]).map((row) => row.id);
}

/**
 * The daily check: picks up tracking numbers for every order still waiting
 * for its label, and retries shipped emails that failed.
 */
export async function sweepRoyalMailTracking(now = Date.now()): Promise<{ checked: number; shipped: number; emailed: number }> {
  let checked = 0, shippedCount = 0, emailed = 0;

  if (royalMailConfigured()) {
    const waitingIds = ids(await getSupabaseAdmin()
      .from("orders")
      .select("id")
      .eq("status", "unshipped")
      .is("tracking_number", null)
      .eq("royal_mail->>status", "sent")
      .gte("created_at", new Date(now - FOLLOW_FOR_MS).toISOString()));
    const waiting = (await Promise.all(waitingIds.map(getServerOrderById))).filter((order): order is Order => Boolean(order));
    checked = waiting.length;
    const { shipped } = await syncRoyalMailTracking(waiting);
    shippedCount = shipped.length;
    for (const order of shipped) if (await notifyShipped(order)) emailed++;
  }

  const unsentIds = ids(await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .eq("status", "shipped")
    .is("shipped_email_sent_at", null)
    .gte("created_at", new Date(now - EMAIL_RETRY_MS).toISOString()));
  for (const id of unsentIds) {
    const order = await getServerOrderById(id);
    if (order && (await notifyShipped(order))) emailed++;
  }
  return { checked, shipped: shippedCount, emailed };
}
