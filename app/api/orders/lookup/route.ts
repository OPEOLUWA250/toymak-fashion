import { NextRequest, NextResponse } from "next/server";
import { findGuestOrders, parseGuestCredentials } from "@/lib/server/guest-orders";

/** Guest order tracking: checkout email + order number, no account needed. */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; orderNumber?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const credentials = parseGuestCredentials(body.email, body.orderNumber);
  if (!credentials) {
    return NextResponse.json({ error: "Enter the email you checked out with and your order number." }, { status: 400 });
  }

  try {
    const orders = await findGuestOrders(credentials.email, credentials.orderNumber);
    if (orders.length === 0) {
      return NextResponse.json({ error: "No order matches that email and order number." }, { status: 404 });
    }
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not look up your order. Please retry." }, { status: 500 });
  }
}
