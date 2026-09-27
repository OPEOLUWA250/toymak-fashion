import { verifyCheckoutSnapshot } from "./checkout-snapshots";
import Stripe from "stripe";
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

const STRIPE_CURRENCY_MAP: Record<string, "GBP" | "USD"> = {
  gbp: "GBP",
  usd: "USD",
};

/**
 * Retrieves a Checkout Session and normalizes it. Shared by the
 * client-facing verify route and the webhook route so a payment resolves
 * to the exact same order data no matter which one processes it first.
 * New checkouts use a stored price snapshot; legacy sessions use Stripe line
 * items. Returns null unless payment is confirmed.
 */
export async function verifyStripeSession(sessionId: string): Promise<PaymentVerification | null> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return null;
  }

  const metadata = session.metadata ?? {};
  if (metadata.checkout_snapshot_id) return verifyCheckoutSnapshot(metadata.checkout_snapshot_id, "stripe", session.amount_total ?? -1, session.currency ?? "");
  const shipping = metadata.shipping_json ? JSON.parse(metadata.shipping_json) : {};
  const compactItems: CompactItem[] = metadata.items_json ? JSON.parse(metadata.items_json) : [];
  const country = shipping.country ?? "United Kingdom";
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? "";
  const customerName = metadata.customer_name ?? "Guest";
  const customerPhone = metadata.customer_phone ?? "";
  const discountCode: string | undefined = metadata.discount_code || undefined;

  // Legacy sessions created before snapshots: use the prices held by Stripe,
  // never today's catalogue or a coupon that may already have been redeemed.
  const currency = STRIPE_CURRENCY_MAP[session.currency ?? ''];
  if (!currency) throw new Error('Unexpected payment currency.');
  const lines = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
  if (lines.has_more || lines.data.length < compactItems.length || compactItems.length === 0) throw new Error('Could not reconcile this legacy checkout. Contact support.');
  const orderItems = compactItems.map((item, index) => {
    const line = lines.data[index];
    if (line.quantity !== item.q || line.price?.unit_amount == null) throw new Error('Checkout quantities do not match.');
    return { product_id: item.i, product_name: line.description ?? "Item", quantity: item.q, size: item.s, color: item.c, unit_price: line.price.unit_amount / 100, subtotal: line.amount_total / 100 };
  });
  const subtotal = orderItems.reduce((sum, item) => sum + Math.round(item.subtotal * 100), 0) / 100;
  const extras = lines.data.slice(compactItems.length);
  const shippingCost = extras.filter(l => l.description === 'Shipping').reduce((sum,l) => sum + l.amount_total, 0) / 100;
  const tax = extras.filter(l => l.description === 'VAT').reduce((sum,l) => sum + l.amount_total, 0) / 100;
  const total = (session.amount_total ?? 0) / 100;
  if (Math.round((subtotal + shippingCost + tax) * 100) !== session.amount_total) throw new Error('Checkout totals do not match payment.');
  const discount = 0; // Legacy metadata did not snapshot the original discount.

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
    currency,
    customerEmail,
    customerName,
    customerPhone,
    shippingAddress,
    orderItems,
    subtotal,
    shippingCost,
    tax,
    total: (session.amount_total ?? Math.round(total * 100)) / 100,
    discount,
    discountCode,
  };
}
