import { NextRequest, NextResponse } from "next/server";
import { verifyStripeSession } from "@/lib/server/stripe-orders";
import { verifyPaystackTransaction } from "@/lib/server/paystack-orders";
import { buildOrderFromVerification } from "@/lib/order-builder";
import { appendServerOrder } from "@/lib/server/order-store";

interface ConfirmRequestBody {
  gateway: "stripe" | "paystack";
  paymentId: string;
}

/**
 * Called by the client right after /checkout/success verifies a payment, so
 * the order lands in the server-side store (and broadcasts to the admin
 * dashboard in real time) even when no webhook relay is running — which,
 * locally, is most of the time unless `stripe listen` / an ngrok tunnel is
 * actively set up. The webhook routes remain the safety net for when the
 * customer's browser never makes it back here at all.
 *
 * The client only sends an id — never trusted order data — this route
 * re-verifies directly with Stripe/Paystack itself before storing anything,
 * the same way the webhook routes do, so it can't be used to inject a fake
 * order.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<ConfirmRequestBody>;
  const { gateway, paymentId } = body;

  if (!paymentId || (gateway !== "stripe" && gateway !== "paystack")) {
    return NextResponse.json(
      { error: "gateway and paymentId are required." },
      { status: 400 },
    );
  }

  try {
    const verification =
      gateway === "stripe"
        ? await verifyStripeSession(paymentId)
        : await verifyPaystackTransaction(paymentId);

    if (!verification) {
      return NextResponse.json({ error: "Payment not confirmed." }, { status: 400 });
    }

    const order = buildOrderFromVerification(
      paymentId,
      gateway,
      gateway === "stripe" ? "GBP" : "NGN",
      verification,
    );
    const { added } = await appendServerOrder(order);
    return NextResponse.json({ added });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not confirm this order." },
      { status: 500 },
    );
  }
}
