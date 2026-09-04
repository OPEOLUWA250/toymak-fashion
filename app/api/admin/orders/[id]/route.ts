import { NextRequest, NextResponse } from "next/server";
import { updateServerOrderStatus } from "@/lib/server/order-store";
import { OrderStatus } from "@/lib/types";

interface UpdateOrderBody {
  status: OrderStatus;
  trackingLink?: string;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { status, trackingLink } = (await request.json()) as UpdateOrderBody;
    const order = await updateServerOrderStatus(id, status, trackingLink);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 },
    );
  }
}
