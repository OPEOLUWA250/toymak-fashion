import type { DeliveryNoticeStage, DeliveryTracking } from "@/lib/delivery";
import type { Order } from "@/lib/types";
import { getSupabaseAdmin } from "./supabase";
import { getServerOrderById } from "./order-store";
import { fetchParcel2GoTracking, parcel2GoConfigured } from "./parcel2go";
import { sendDeliveryEmail } from "./delivery-email";

/**
 * Keeps shipped orders' delivery status in step with Parcel2Go and emails
 * the customer when the parcel is out for delivery and when it's delivered.
 * Runs when the admin saves a Parcel2Go reference, when a customer opens
 * Track Order, and on the daily /api/cron/delivery-tracking job.
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

function needsRefresh(order: Order): boolean {
  return order.status === "shipped" && Boolean(order.parcel2go_reference) && order.delivery?.stage !== "delivered";
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
  if (!tracking || sameStatus(order.delivery, tracking)) return order;

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update({ delivery_tracking: tracking })
    .eq("id", order.id)
    // The reference may have changed while Parcel2Go was answering.
    .eq("parcel2go_reference", order.parcel2go_reference!)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not save delivery tracking for order ${order.id}: ${error.message}`);
  return data ? { ...order, delivery: tracking } : order;
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

/** The daily job: every shipped, undelivered order with a Parcel2Go reference. */
export async function sweepDeliveryTracking(): Promise<{ checked: number; updated: number; emailed: number; failed: number }> {
  if (!parcel2GoConfigured()) return { checked: 0, updated: 0, emailed: 0, failed: 0 };

  const since = new Date(Date.now() - TRACK_FOR_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id")
    .eq("status", "shipped")
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
