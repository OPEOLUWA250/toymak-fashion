import { NextResponse } from "next/server";
import { getServerOrders } from "@/lib/server/order-store";
import { adminRoute } from "@/lib/server/admin-auth";

/**
 * Read by the admin dashboard's useOrders() on load so any order recorded by
 * a webhook — i.e. one whose customer never made it back to
 * /checkout/success — still shows up. Customers use POST /api/orders/lookup.
 *
 * WARNING: unauthenticated — returns every order's personal data. Must be
 * protected once admin authentication exists.
 */
export const GET = adminRoute(async () => {
  try {
    const orders = await getServerOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to read server orders:", error);
    return NextResponse.json({ error: "Could not load orders. Please retry." }, { status: 500 });
  }
});
