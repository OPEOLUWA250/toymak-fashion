import { NextRequest, NextResponse, after } from "next/server";
import { getServerOrderById, updateServerOrderStatus } from "@/lib/server/order-store";
import { notifyDelivery, refreshOrderDelivery } from "@/lib/server/delivery-tracking";
import { parcel2GoConfigured } from "@/lib/server/parcel2go";
import { normalizeParcel2GoReference } from "@/lib/delivery";
import { OrderStatus } from "@/lib/types";
import { adminRoute } from "@/lib/server/admin-auth";

interface UpdateOrderBody {
  status: OrderStatus;
  trackingLink?: string;
  /** Parcel2Go order number or courier tracking number; "" removes it. */
  parcel2goReference?: string;
}

export const PUT = adminRoute(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { status, trackingLink, parcel2goReference } = (await request.json()) as UpdateOrderBody;
    if (status !== "unshipped" && status !== "shipped") {
      return NextResponse.json({ error: "Unknown order status." }, { status: 400 });
    }

    let reference: string | null | undefined;
    if (typeof parcel2goReference === "string") {
      reference = parcel2goReference.trim() ? normalizeParcel2GoReference(parcel2goReference) : null;
      if (reference === null && parcel2goReference.trim()) {
        return NextResponse.json({ error: "That doesn't look like a Parcel2Go order number or tracking number. Use letters and numbers only." }, { status: 400 });
      }
    }

    const previous = await getServerOrderById(id);
    if (!previous) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    let order = await updateServerOrderStatus(id, status, trackingLink, reference, previous);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Check the parcel straight away, so a mistyped number shows up now
    // rather than as a customer with no tracking.
    let trackingNotice: string | undefined;
    if (order.status === "shipped" && order.parcel2go_reference) {
      if (!parcel2GoConfigured()) {
        trackingNotice = "Saved, but Parcel2Go isn't connected (PARCEL2GO_CLIENT_ID / PARCEL2GO_CLIENT_SECRET), so tracking won't update.";
      } else {
        try {
          order = await refreshOrderDelivery(order);
          if (!order.delivery) {
            trackingNotice = "Saved. Parcel2Go has no tracking for this number yet. That's normal until the courier scans the parcel; if it stays empty, check the number.";
          }
        } catch (error) {
          trackingNotice = `Saved, but Parcel2Go couldn't be checked: ${error instanceof Error ? error.message : "unknown error"}`;
        }
        const current = order;
        after(async () => {
          await notifyDelivery(current).catch((error) => console.error(`Delivery email for order ${id} failed:`, error));
        });
      }
    }

    return NextResponse.json({ order, trackingNotice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 },
    );
  }
});
