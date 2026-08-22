import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPaystackSecretKey, verifyPaystackTransaction } from "@/lib/server/paystack-orders";
import { buildOrderFromVerification } from "@/lib/order-builder";
import { appendServerOrder } from "@/lib/server/order-store";

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Server-to-server confirmation, independent of the customer's browser.
 * Paystack signs the raw body with HMAC-SHA512 using the same secret key
 * used everywhere else — no separate webhook secret to configure. See the
 * ngrok setup note in .env.local.example for testing this locally.
 */
export async function POST(request: NextRequest) {
  let secretKey: string;
  try {
    secretKey = getPaystackSecretKey();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paystack isn't configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-paystack-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  const expectedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  if (!signaturesMatch(expectedSignature, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const reference = event.data?.reference;
      if (reference) {
        const verification = await verifyPaystackTransaction(reference);
        if (verification) {
          const order = buildOrderFromVerification(reference, "paystack", "NGN", verification);
          await appendServerOrder(order);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Non-2xx so Paystack retries with backoff — better than silently
    // dropping the order on a transient failure (e.g. a disk hiccup).
    console.error("Paystack webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
