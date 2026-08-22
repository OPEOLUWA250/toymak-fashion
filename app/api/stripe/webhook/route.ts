import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, verifyStripeSession } from "@/lib/server/stripe-orders";
import { buildOrderFromVerification } from "@/lib/order-builder";
import { appendServerOrder } from "@/lib/server/order-store";

/**
 * Server-to-server confirmation, independent of the customer's browser.
 * /checkout/success verifying client-side is fast and covers the common
 * case, but if the customer closes the tab right after paying, this is
 * the only thing that still records the order. Requires STRIPE_WEBHOOK_SECRET
 * — see the Stripe CLI setup note in .env.local.example.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const verification = await verifyStripeSession(session.id);
      if (verification) {
        const order = buildOrderFromVerification(session.id, "stripe", "GBP", verification);
        await appendServerOrder(order);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Non-2xx so Stripe retries with backoff — better than silently
    // dropping the order on a transient failure (e.g. a disk hiccup).
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
