import { NextRequest, NextResponse } from "next/server";
import { findGuestOrders, parseGuestCredentials } from "@/lib/server/guest-orders";
import { generateReceiptPdf } from "@/lib/server/receipt-pdf";

/**
 * Guest receipt download, gated by checkout email + order number. POST (a
 * plain HTML form submit from the tracking/success pages) so the email never
 * ends up in a URL, browser history, or server logs.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let fields: { email?: unknown; orderNumber?: unknown } = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      fields = await request.json();
    } else {
      const form = await request.formData();
      fields = { email: form.get("email"), orderNumber: form.get("orderNumber") };
    }
  } catch {
    // Falls through to the validation error below.
  }

  const credentials = parseGuestCredentials(fields.email, fields.orderNumber);
  if (!credentials) {
    return NextResponse.json({ error: "Enter the email you checked out with and your order number." }, { status: 400 });
  }

  try {
    const [order] = await findGuestOrders(credentials.email, credentials.orderNumber, id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const pdfBuffer = await generateReceiptPdf(order);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="toymak-receipt-${order.tracking_id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate receipt." }, { status: 500 });
  }
}
