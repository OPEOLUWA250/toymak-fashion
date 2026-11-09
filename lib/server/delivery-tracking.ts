import { deliveryStageRank, type DeliveryNoticeStage, type DeliveryTracking } from "@/lib/delivery";
import type { Order } from "@/lib/types";
import { getSupabaseAdmin } from "./supabase";
import { getServerOrderById } from "./order-store";
import { fetchParcel2GoTracking, parcel2GoConfigured, stageFromName, validTime } from "./parcel2go";
import { sendDeliveryEmail } from "./delivery-email";

/**
 * Keeps shipped orders' delivery status in step with Parcel2Go and emails
 * the customer when the parcel is out for delivery and when it's delivered.
 * Runs when the admin saves a Parcel2Go reference, when a customer opens
 * Track Order, and on the daily /api/cron/delivery-tracking job. Orders
 * booked through lib/server/parcel2go-booking.ts are followed too, and turn
 * "shipped" when the courier first scans the parcel.
 */

// Old news isn't worth an email: a parcel found "out for delivery" a day
// later has almost certainly arrived, and a reference added for a parcel
// delivered last week shouldn't announce it now.
const NOTICE_WINDOW_MS: Record<DeliveryNoticeStage, number> = {
  out_for_delivery: 18 * 60 * 60 * 1000,
  delivered: 3 * 24 * 60 * 60 * 1000,
};

// Parcels still undelivered after this long need a person, not polling.
const TRACK_FOR_DAYS = 45;

/** Shipped orders, and orders booked on Parcel2Go that the courier may not have yet. */
function isTracked(order: Order): boolean {
  return Boolean(order.parcel2go_reference) && (order.status === "shipped" || Boolean(order.parcel2go_booking));
}

function needsRefresh(order: Order): boolean {
  return isTracked(order) && order.delivery?.stage !== "delivered";
}

/** A booked order becomes "shipped" once the courier has scanned the parcel. */
function shippedOnceScanned(order: Order, tracking: DeliveryTracking): Pick<Order, "status"> {
  return { status: order.status === "unshipped" && tracking.stage !== "awaiting" ? "shipped" : order.status };
}

function sameStatus(a: DeliveryTracking | null | undefined, b: DeliveryTracking): boolean {
  return Boolean(a) && a!.stage === b.stage && a!.latestEventAt === b.latestEventAt && a!.latestEvent === b.latestEvent
    && a!.estimatedDelivery === b.estimatedDelivery && a!.problem === b.problem;
}

/**
 * Reads the order's parcel from Parcel2Go and saves it when anything
 * changed. Returns the order as it now stands. Unchanged reads aren't
 * written, so the activity log only shows real progress.
 */
export async function refreshOrderDelivery(order: Order): Promise<Order> {
  if (!needsRefresh(order) || !parcel2GoConfigured()) return order;

  const tracking = await fetchParcel2GoTracking(order.parcel2go_reference!, order.shipping_address.postalCode ?? "");
  if (!tracking) return order;
  const { status } = shippedOnceScanned(order, tracking);
  if (sameStatus(order.delivery, tracking) && status === order.status) return order;

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update({ delivery_tracking: tracking, status })
    .eq("id", order.id)
    // The reference may have changed while Parcel2Go was answering.
    .eq("parcel2go_reference", order.parcel2go_reference!)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not save delivery tracking for order ${order.id}: ${error.message}`);
  return data ? { ...order, delivery: tracking, status } : order;
}

/** Which email, if any, the order's delivery status calls for now. */
export function deliveryNoticeDue(order: Order, now = Date.now()): DeliveryNoticeStage | null {
  const tracking = order.delivery;
  if (!tracking || order.status !== "shipped") return null;
  const stage = tracking.stage;
  if (stage !== "out_for_delivery" && stage !== "delivered") return null;
  if (order.delivery_notified_stage === "delivered") return null;
  if (order.delivery_notified_stage === stage) return null;

  const at = Date.parse(tracking.stageAt ?? tracking.latestEventAt ?? tracking.updatedAt);
  if (!Number.isFinite(at) || now - at > NOTICE_WINDOW_MS[stage]) return null;
  return stage;
}

/**
 * Sends the email the order is due, once. The order is claimed in the
 * database first, so two checks running at the same moment can't both send;
 * a failed send releases it for the next check.
 */
export async function notifyDelivery(order: Order): Promise<DeliveryNoticeStage | null> {
  const stage = deliveryNoticeDue(order);
  if (!stage) return null;

  const previous = order.delivery_notified_stage ?? null;
  let claim = getSupabaseAdmin().from("orders").update({ delivery_notified_stage: stage }).eq("id", order.id);
  claim = previous ? claim.eq("delivery_notified_stage", previous) : claim.is("delivery_notified_stage", null);
  const { data, error } = await claim.select("id").maybeSingle();
  if (error || !data) return null;

  if (await sendDeliveryEmail(order, stage).catch(() => false)) return stage;

  await getSupabaseAdmin().from("orders").update({ delivery_notified_stage: previous }).eq("id", order.id).eq("delivery_notified_stage", stage);
  return null;
}

/** Refresh then email, never throwing: for background use. */
export async function syncOrderDelivery(order: Order): Promise<Order> {
  try {
    const updated = await refreshOrderDelivery(order);
    await notifyDelivery(updated);
    return updated;
  } catch (error) {
    console.error(`Delivery tracking for order ${order.id} failed:`, error);
    return order;
  }
}

/**
 * A Tracking webhook from Parcel2Go: a parcel (by its P2G number) reached a
 * new stage. The order linked to it gets its full status re-read, and the
 * stage the webhook names is used if Parcel2Go's tracking hasn't caught up
 * yet. Returns how many orders it updated; parcels not linked to an order
 * (or linked by the courier's number instead) are ignored here and picked
 * up by the daily check. Throws on a temporary failure so Parcel2Go retries.
 */
export async function applyParcel2GoTrackingEvent(event: {
  orderLineId: string;
  stage: string | null;
  at: string | null;
  description: string | null;
}): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .in("parcel2go_reference", [event.orderLineId, `P2G${event.orderLineId}`]);
  if (error) throw new Error(`Could not find the order for Parcel2Go ${event.orderLineId}: ${error.message}`);

  let updated = 0;
  for (const { id } of data ?? []) {
    const order = await getServerOrderById(id);
    if (!order || !isTracked(order)) continue;

    let fresh = await refreshOrderDelivery(order);
    const hinted = stageFromName(event.stage);
    const current = fresh.delivery?.stage ?? "awaiting";
    if (hinted && deliveryStageRank(hinted) > deliveryStageRank(current)) {
      const at = validTime(event.at);
      const tracking: DeliveryTracking = {
        estimatedDelivery: null,
        problem: false,
        ...fresh.delivery,
        stage: hinted,
        stageAt: at,
        latestEvent: event.description ?? fresh.delivery?.latestEvent ?? null,
        latestEventAt: at ?? fresh.delivery?.latestEventAt ?? null,
        updatedAt: new Date().toISOString(),
      };
      const { status } = shippedOnceScanned(fresh, tracking);
      const { error: saveError } = await getSupabaseAdmin()
        .from("orders")
        .update({ delivery_tracking: tracking, status })
        .eq("id", order.id)
        .eq("parcel2go_reference", order.parcel2go_reference!);
      if (saveError) throw new Error(`Could not save delivery tracking for order ${order.id}: ${saveError.message}`);
      fresh = { ...fresh, delivery: tracking, status };
    }

    await notifyDelivery(fresh);
    updated++;
  }
  return updated;
}

/** The daily job: every undelivered order with a Parcel2Go reference, shipped or booked. */
export async function sweepDeliveryTracking(): Promise<{ checked: number; updated: number; emailed: number; failed: number }> {
  if (!parcel2GoConfigured()) return { checked: 0, updated: 0, emailed: 0, failed: 0 };

  const since = new Date(Date.now() - TRACK_FOR_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .not("parcel2go_reference", "is", null)
    .gte("created_at", since);
  if (error) throw new Error(`Could not load shipped orders: ${error.message}`);

  let checked = 0, updated = 0, emailed = 0, failed = 0;
  for (const { id } of data ?? []) {
    const order = await getServerOrderById(id);
    if (!order) continue;
    // Delivered orders are only revisited for an email that failed to send.
    if (!needsRefresh(order) && !deliveryNoticeDue(order)) continue;
    checked++;
    try {
      const fresh = await refreshOrderDelivery(order);
      if (fresh.delivery !== order.delivery) updated++;
      if (await notifyDelivery(fresh)) emailed++;
    } catch (error) {
      failed++;
      console.error(`Delivery tracking for order ${id} failed:`, error);
    }
  }
  return { checked, updated, emailed, failed };
}
