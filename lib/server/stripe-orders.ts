import Stripe from "stripe";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { getAllProducts } from "@/lib/server/products";
import { getStoreSettings } from "@/lib/server/settings";
import { validateCouponCode } from "@/lib/server/signups";
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
  const discountCode: string | undefined = metadata.discount_code || undefined;

  // Re-validated here rather than trusted from Stripe's own metadata echo —
  // the code was checked once at /api/stripe/checkout time, but this is the
  // moment it actually gets redeemed, so it's checked again against current
  // state (e.g. someone else's order redeemed it in between).
  const discountPercent = discountCode
    ? (await validateCouponCode(discountCode)).discountPercent
    : 0;

  const itemInputs = compactItems.map((item) => ({
    product_id: item.i,
    quantity: item.q,
    size: item.s,
    color: item.c,
  }));

  // Trust what Stripe itself actually charged in, not a re-derivation from
  // country — the two should agree (checkout sets currency from country
  // too) but session.currency is the authoritative record of the real charge.
  const currency = STRIPE_CURRENCY_MAP[session.currency ?? "gbp"] ?? "GBP";

  const products = await getAllProducts();
  const settings = await getStoreSettings();
  const orderItems = buildOrderItems(itemInputs, currency, products, discountPercent);
  const { subtotal, shipping: shippingCost, tax, total, discount } = calculateOrderTotals(
    itemInputs,
    currency,
    products,
    settings,
    discountPercent,
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
    currency,
    customerEmail,
    customerName,
    customerPhone,
    shippingAddress,
    orderItems,
    subtotal,
    shippingCost,
    tax,
    total,
    discount,
    discountCode: discountPercent > 0 ? discountCode : undefined,
  };
}
