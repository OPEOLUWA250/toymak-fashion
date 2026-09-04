import { NextRequest, NextResponse } from "next/server";
import { getServerOrderById } from "@/lib/server/order-store";
import { generateReceiptPdf } from "@/lib/server/receipt-pdf";

/**
 * Public, but gated by the same "email is the password" model the rest of
 * the storefront uses for order lookup (no real accounts exist) — the
 * requester must know the exact email the order was placed under.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  try {
    const order = await getServerOrderById(id);
    if (!order || order.customer_email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const pdfBuffer = await generateReceiptPdf(order);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="toymak-receipt-${order.tracking_id}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate receipt." },
      { status: 500 },
    );
  }
}
