import { Order } from "@/lib/types";
import { eventBus } from "./event-bus";
import { decrementProductStock } from "./products";
import { getSupabaseAdmin } from "./supabase";
import { redeemCouponCode } from "./signups";
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail } from "./order-email";
import { getStoreSettings } from "./settings";
import { deleteAbandonedCartByEmail } from "./abandoned-carts";

interface OrderRow {
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: Order["shipping_address"];
  status: Order["status"];
  tracking_link: string | null;
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
    id: row.id,
    tracking_id: row.tracking_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    shipping_address: row.shipping_address,
    status: row.status,
    tracking_link: row.tracking_link ?? undefined,
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
export async function getServerOrders(): Promise<Order[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

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

  const { error } = await supabase.from("orders").insert({
    id: order.id,
    tracking_id: order.tracking_id,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    shipping_address: order.shipping_address,
    status: order.status,
    tracking_link: order.tracking_link ?? null,
    currency: order.currency,
    payment_gateway: order.payment_gateway,
    payment_reference: order.payment_reference,
    items: order.items,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    tax: order.tax,
    discount_applied: order.discount_applied,
    total_amount: order.total_amount,
  });

  if (error) {
    if (error.code === "23505") {
      // Already recorded by an earlier webhook/confirm call for this
      // reference — exactly the retry case this is meant to absorb.
      return { added: false };
    }
    throw new Error(`Failed to save order: ${error.message}`);
  }

  eventBus.emit("order", order);
  await decrementProductStock(order.items);

  if (options.discountCode) {
    await redeemCouponCode(options.discountCode);
  }

  // A real conversion — clear any abandoned-cart record for this email so
  // it never gets a "you left something behind" email after actually buying.
  void deleteAbandonedCartByEmail(order.customer_email).catch((error) =>
    console.error(`Could not clear abandoned cart for order ${order.id}:`, error),
  );

  // Fire-and-forget — a slow or failed email must never hold up (or fail)
  // the order write, which is the part that actually matters.
  const origin = options.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://toymakenterprise.co.uk";
  void sendOrderConfirmationEmail(order, origin);
  void getStoreSettings()
    .then((settings) => sendAdminOrderNotificationEmail(order, origin, settings.orderNotificationEmail))
    .catch((error) =>
      console.error(`Could not load settings for admin order notification (order ${order.id}):`, error),
    );

  return { added: true };
}

export async function updateServerOrderStatus(
  id: string,
  status: Order["status"],
  trackingLink?: string,
): Promise<Order | null> {
  const updates: Record<string, unknown> = { status };
  if (trackingLink !== undefined) updates.tracking_link = trackingLink;

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Failed to update order ${id}: ${error.message}`);
  return data ? rowToOrder(data as OrderRow) : null;
}
