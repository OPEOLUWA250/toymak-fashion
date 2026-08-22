import { NextResponse } from "next/server";
import { getServerOrders } from "@/lib/server/order-store";

/**
 * Read by useOrders() on load so any order recorded by a webhook — i.e. one
 * whose customer never made it back to /checkout/success — still shows up
 * for the admin dashboard and the customer's own account lookup, on
 * whichever browser next asks.
 */
export async function GET() {
  try {
    const orders = await getServerOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to read server orders:", error);
    return NextResponse.json({ orders: [] });
  }
}
