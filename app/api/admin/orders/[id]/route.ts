import { NextRequest, NextResponse, after } from "next/server";
import { getServerOrderById, updateServerOrderStatus } from "@/lib/server/order-store";
import { notifyShipped } from "@/lib/server/royal-mail-orders";
import { normalizeTrackingNumber } from "@/lib/royal-mail";
import { OrderStatus } from "@/lib/types";
import { adminRoute } from "@/lib/server/admin-auth";

interface UpdateOrderBody {
  status: OrderStatus;
  trackingLink?: string;
  /** Royal Mail tracking number; "" removes it. */
  trackingNumber?: string;
}

export const PUT = adminRoute(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { status, trackingLink, trackingNumber } = (await request.json()) as UpdateOrderBody;
    if (status !== "unshipped" && status !== "shipped") {
      return NextResponse.json({ error: "Unknown order status." }, { status: 400 });
    }

    let number: string | null | undefined;
    if (typeof trackingNumber === "string") {
      number = trackingNumber.trim() ? normalizeTrackingNumber(trackingNumber) : null;
      if (number === null && trackingNumber.trim()) {
        return NextResponse.json({ error: "That doesn't look like a tracking number. Use letters and numbers only, e.g. MZ584625660GB." }, { status: 400 });
      }
    }

    const previous = await getServerOrderById(id);
    if (!previous) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = await updateServerOrderStatus(id, status, trackingLink, number, previous);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Shipped with a way to follow it: the customer is emailed it (once).
    after(async () => {
      await notifyShipped(order).catch((error) => console.error(`Shipped email for order ${id} failed:`, error));
    });
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 },
    );
  }
});
