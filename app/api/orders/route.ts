import { NextResponse, after } from "next/server";
import { getServerOrders } from "@/lib/server/order-store";
import { notifyShipped, syncRoyalMailTrackingQuickly } from "@/lib/server/royal-mail-orders";
import { adminRoute } from "@/lib/server/admin-auth";

// Picking up tracking numbers from Click & Drop (one call) on top of the read.
export const maxDuration = 30;

/**
 * Read by the admin dashboard's useOrders() on load so any order recorded by
 * a webhook — i.e. one whose customer never made it back to
 * /checkout/success — still shows up. Customers use POST /api/orders/lookup.
 *
 * Orders waiting in Click & Drop get their tracking number here once the
 * label is printed, so the list shows them shipped and the customer is
 * emailed.
 */
export const GET = adminRoute(async () => {
  try {
    const { orders, shipped } = await syncRoyalMailTrackingQuickly(await getServerOrders(), { throttled: true });
    after(async () => {
      for (const order of shipped) {
        await notifyShipped(order).catch((error) => console.error(`Shipped email for order ${order.id} failed:`, error));
      }
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to read server orders:", error);
    return NextResponse.json({ error: "Could not load orders. Please retry." }, { status: 500 });
  }
});
