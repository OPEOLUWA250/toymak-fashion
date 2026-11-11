import { Order } from "@/lib/types";
import { eventBus } from "./event-bus";

import { getSupabaseAdmin } from "./supabase";

import { dispatchOrderEmails } from "./order-outbox";
import { after } from "next/server";
import { deleteAbandonedCartByEmail } from "./abandoned-carts";

interface OrderRow {
  refunded_amount?: number;
  fulfillment_issue?: string | null;
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: Order["shipping_address"];
  status: Order["status"];
  tracking_link: string | null;
  tracking_number?: string | null;
  royal_mail?: Order["royal_mail"];
  shipped_email_sent_at?: string | null;
  currency: Order["currency"];
  payment_gateway: Order["payment_gateway"];
  payment_reference: string;
  items: Order["items"];
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount_applied: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

function rowToOrder(row: OrderRow): Order {
  return {
    refunded_amount: Number(row.refunded_amount ?? 0),
    fulfillment_issue: row.fulfillment_issue,
    id: row.id,
    tracking_id: row.tracking_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    shipping_address: row.shipping_address,
    status: row.status,
    tracking_link: row.tracking_link ?? undefined,
    tracking_number: row.tracking_number ?? undefined,
    royal_mail: row.royal_mail ?? null,
    shipped_email_sent_at: row.shipped_email_sent_at ?? null,
    currency: row.currency,
    payment_gateway: row.payment_gateway,
    payment_reference: row.payment_reference,
    items: row.items,
    subtotal: Number(row.subtotal),
    shipping_cost: Number(row.shipping_cost),
    tax: Number(row.tax),
    discount_applied: Number(row.discount_applied),
    total_amount: Number(row.total_amount),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Durable, browser-independent record of confirmed payments — written by
 * the Stripe/Paystack webhook routes (and the client-triggered confirm
 * route) so an order exists even if the customer's browser never makes it
 * back to /checkout/success. Client pages (useOrders) pull from
 * GET /api/orders.
 */
export async function getServerOrders(email?: string): Promise<Order[]> {
  let query = getSupabaseAdmin()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (email) query = query.ilike("customer_email", email.replace(/[%_]/g, "\\$&"));
  const { data, error } = await query;

  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data as OrderRow[]).map(rowToOrder);
}

export async function getServerOrderById(id: string): Promise<Order | null> {
  const { data, error } = await getSupabaseAdmin().from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load order ${id}: ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}

/**
 * Idempotent on payment_reference — Stripe and Paystack both retry webhook
 * delivery, so the same event can arrive more than once. Idempotency is
 * enforced by the table's own unique constraint (a race between two near-
 * simultaneous retries is resolved by Postgres, not by an in-process lock —
 * safe across multiple server instances, unlike the old file-based version's
 * write-lock which only worked within a single Node process). Stock is only
 * decremented the first time an order's reference is actually inserted —
 * same for redeeming a coupon code and sending the confirmation email, both
 * gated behind the same "actually new" check so a webhook retry never
 * double-spends a code or double-emails a customer.
 */
export async function appendServerOrder(
  order: Order,
  options: { origin?: string; discountCode?: string } = {},
): Promise<{ added: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: added, error } = await supabase.rpc("record_paid_order", { payload: order, coupon: options.discountCode ?? null });
  if (error) throw new Error(`Failed to record order: ${error.message}`);
  if (!added) return { added: false };
  eventBus.emit("order", order);

  // A real conversion — clear any abandoned-cart record for this email so
  // it never gets a "you left something behind" email after actually buying.
  // Run after the response via after(): a bare un-awaited promise can be cut
  // off when a serverless function finishes.
  after(async () => {
    await deleteAbandonedCartByEmail(order.customer_email).catch((error) =>
      console.error(`Could not clear abandoned cart for order ${order.id}:`, error),
    );
    // Send the order to Royal Mail Click & Drop first (when automatic
    // sending is on), so the shop's new-order email can say it's there.
    // Loaded here rather than at the top, as that code reads orders from
    // this file. It never throws; the emails go out either way.
    const { autoSendToRoyalMail } = await import("./royal-mail-orders");
    await autoSendToRoyalMail(order);
    await dispatchOrderEmails(order.id);
  });

  return { added: true };
}

export async function updateServerOrderStatus(
  id: string,
  status: Order["status"],
  trackingLink?: string,
  /** A new Royal Mail tracking number, or null to remove it; undefined leaves it. */
  trackingNumber?: string | null,
  previous?: Order,
): Promise<Order | null> {
  const updates: Record<string, unknown> = { status };
  if (trackingLink !== undefined) updates.tracking_link = trackingLink;
  if (trackingNumber !== undefined && trackingNumber !== (previous?.tracking_number ?? null)) {
    updates.tracking_number = trackingNumber;
    // A corrected number: the customer is emailed the right one.
    if (trackingNumber && previous?.tracking_number) updates.shipped_email_sent_at = null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Failed to update order ${id}: ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}
