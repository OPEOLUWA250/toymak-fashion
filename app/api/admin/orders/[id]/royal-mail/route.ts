import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/admin-auth";
import { RoyalMailRefusal } from "@/lib/server/royal-mail";
import { awaitingLabel, checkRoyalMailOrder, sendOrderToRoyalMail } from "@/lib/server/royal-mail-orders";
import { getServerOrderById } from "@/lib/server/order-store";

export const dynamic = "force-dynamic";
// Listing services, then creating the order: two Royal Mail calls (three on a retry).
export const maxDuration = 60;

/**
 * The Royal Mail button on an order: sends it to Click & Drop (or sends it
 * again after a failure), or, once it's there, checks for its tracking
 * number. Answers with the order as it now stands and, when it didn't fully
 * work, why.
 */
export const POST = adminRoute(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const current = await getServerOrderById(id);
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const { order, error } = awaitingLabel(current)
      ? await checkRoyalMailOrder(id)
      : await sendOrderToRoyalMail(id, "manual");
    return NextResponse.json({ order, error });
  } catch (error) {
    const status = error instanceof RoyalMailRefusal ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reach Royal Mail." }, { status });
  }
});
