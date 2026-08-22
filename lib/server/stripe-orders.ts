import Stripe from "stripe";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { PaymentVerification } from "@/lib/order-builder";
import { Address } from "@/lib/types";

export function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe isn't configured yet. Add STRIPE_SECRET_KEY to .env.local.");
  }
  return secretKey;
}

export function getStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}

interface CompactItem {
  i: string;
  q: number;
  s: string;
  c: string;
}

/**
 * Retrieves a Checkout Session and normalizes it. Shared by the
 * client-facing verify route and the webhook route so a payment resolves
 * to the exact same order data no matter which one processes it first.
 * Line items/prices are re-derived from the mock catalog rather than
 * trusted from Stripe's own metadata echo. Returns null for anything that
 * isn't a confirmed paid session.
 */
export async function verifyStripeSession(sessionId: string): Promise<PaymentVerification | null> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return null;
  }

  const metadata = session.metadata ?? {};
  const shipping = metadata.shipping_json ? JSON.parse(metadata.shipping_json) : {};
  const compactItems: CompactItem[] = metadata.items_json ? JSON.parse(metadata.items_json) : [];
  const country = shipping.country ?? "United Kingdom";
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? "";
  const customerName = metadata.customer_name ?? "Guest";
  const customerPhone = metadata.customer_phone ?? "";

  const itemInputs = compactItems.map((item) => ({
    product_id: item.i,
    quantity: item.q,
    size: item.s,
    color: item.c,
  }));

  const orderItems = buildOrderItems(itemInputs, "GBP");
  const { subtotal, shipping: shippingCost, tax, total } = calculateOrderTotals(
    itemInputs,
    "GBP",
    country,
  );

  const shippingAddress: Address = {
    fullName: customerName,
    email: customerEmail,
    phone: customerPhone,
    street: shipping.street ?? "",
    city: shipping.city ?? "",
    state: shipping.state ?? "",
    postalCode: shipping.postalCode ?? "",
    country,
  };

  return {
    status: "success",
    customerEmail,
    customerName,
    customerPhone,
    shippingAddress,
    orderItems,
    subtotal,
    shippingCost,
    tax,
    total,
  };
}
