import { NextRequest, NextResponse } from "next/server";
import { createReview, DuplicateReviewError } from "@/lib/server/reviews";
import { findGuestOrders, parseGuestCredentials } from "@/lib/server/guest-orders";

const MAX_COMMENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 80;

// Reviews are read by the /reviews page on the server; this route only takes new ones.

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return bad("Enter valid review details.");
  }
  const { customerName, rating, comment } = body;

  if (typeof customerName !== "string" || !customerName.trim() || typeof comment !== "string" || !comment.trim()) {
    return bad("Name, rating, and a comment are required.");
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return bad("Rating must be between 1 and 5.");
  }
  if (customerName.trim().length > MAX_NAME_LENGTH) return bad("Name is too long.");
  if (comment.trim().length > MAX_COMMENT_LENGTH) return bad("Review is too long.");

  // A hidden field people never see. Bots that fill every input get a
  // normal-looking reply and nothing is saved.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ received: true, verified: false });
  }

  // Optional proof of purchase: the checkout email and order number, the
  // same pair the order-tracking page uses.
  let orderId: string | null = null;
  let location: string | null = null;
  const orderEmail = typeof body.orderEmail === "string" ? body.orderEmail.trim() : "";
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  if (orderEmail || orderNumber) {
    const credentials = parseGuestCredentials(orderEmail, orderNumber);
    if (!credentials) return bad("To verify your purchase, enter the email you checked out with and your order number.");
    let order;
    try {
      [order] = await findGuestOrders(credentials.email, credentials.orderNumber);
    } catch {
      return NextResponse.json({ error: "Could not check your order. Please retry." }, { status: 500 });
    }
    if (!order) return bad("No order matches that email and order number.");
    orderId = order.id;
    location = order.shipping_address.country?.trim() || null;
  }

  try {
    const review = await createReview({
      customerName: customerName.trim(),
      rating,
      comment: comment.trim(),
      location,
      orderId,
    });
    return NextResponse.json({ received: true, verified: review.verified });
  } catch (error) {
    if (error instanceof DuplicateReviewError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit review." },
      { status: 500 },
    );
  }
}
