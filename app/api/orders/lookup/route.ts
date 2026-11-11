import { NextRequest, NextResponse, after } from "next/server";
import { findGuestOrders, parseGuestCredentials } from "@/lib/server/guest-orders";
import { notifyShipped, syncRoyalMailTrackingQuickly } from "@/lib/server/royal-mail-orders";

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
    // A label printed in Click & Drop since the last check shows up now.
    const { orders, shipped } = await syncRoyalMailTrackingQuickly(found);
    after(async () => {
      for (const order of shipped) {
        await notifyShipped(order).catch((error) => console.error(`Shipped email for order ${order.id} failed:`, error));
      }
    });
    // The Click & Drop record is for the admin only.
    const visible = orders.map((order) => ({ ...order, royal_mail: undefined, shipped_email_sent_at: undefined }));
    return NextResponse.json({ orders: visible }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not look up your order. Please retry." }, { status: 500 });
  }
}
