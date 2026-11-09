import { NextRequest, NextResponse, after } from "next/server";
import { findGuestOrders, parseGuestCredentials } from "@/lib/server/guest-orders";
import { notifyDelivery, refreshOrderDelivery } from "@/lib/server/delivery-tracking";
import type { Order } from "@/lib/types";

// A slow Parcel2Go answer shouldn't hold up the page: after this the
// customer sees the last saved status instead.
const TRACKING_WAIT_MS = 6000;

async function withLatestDelivery(order: Order): Promise<Order> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Order>((resolve) => { timer = setTimeout(() => resolve(order), TRACKING_WAIT_MS); });
  try {
    return await Promise.race([refreshOrderDelivery(order).catch(() => order), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Guest order tracking: checkout email + order number, no account needed. */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; orderNumber?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const credentials = parseGuestCredentials(body.email, body.orderNumber);
  if (!credentials) {
    return NextResponse.json({ error: "Enter the email you checked out with and your order number." }, { status: 400 });
  }

  try {
    const found = await findGuestOrders(credentials.email, credentials.orderNumber);
    if (found.length === 0) {
      return NextResponse.json({ error: "No order matches that email and order number." }, { status: 404 });
    }
    const orders = await Promise.all(found.map(withLatestDelivery));
    after(async () => {
      for (const order of orders) {
        await notifyDelivery(order).catch((error) => console.error(`Delivery email for order ${order.id} failed:`, error));
      }
    });
    // The Parcel2Go booking (payment and label links) is for the admin only.
    const visible = orders.map((order) => ({ ...order, parcel2go_booking: undefined }));
    return NextResponse.json({ orders: visible }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not look up your order. Please retry." }, { status: 500 });
  }
}
