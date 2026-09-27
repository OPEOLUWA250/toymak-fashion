import { validateCheckoutItems, validateCheckoutContact } from "@/lib/checkout-validation";
import { saveCheckoutSnapshot } from "@/lib/server/checkout-snapshots";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { getAllProducts } from "@/lib/server/products";
import { getStoreSettings } from "@/lib/server/settings";
import { validateCouponCode } from "@/lib/server/signups";
import { getCheckoutCurrency } from "@/lib/utils";
import { Address } from "@/lib/types";

interface CheckoutRequestBody {
  email: string;
  country: string;
  items: { product_id: string; quantity: number; size: string; color: string }[];
  customer: { fullName: string; phone: string };
  shipping: Omit<Address, "fullName" | "email" | "phone">;
  discountCode?: string;
  success_url: string;
  cancel_url: string;
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Stripe isn't configured yet. Add STRIPE_SECRET_KEY to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  try {
  const body = (await request.json()) as CheckoutRequestBody;
  const { email, items, customer, shipping, discountCode, success_url, cancel_url } = body;

  if (!email || !items?.length || !customer?.fullName || !shipping?.street) {
    return NextResponse.json(
      { error: "Missing required checkout details." },
      { status: 400 },
    );
  }

  // Currency is derived server-side from the shipping country — never
  // trusted from the client — same as every price/total below, recomputed
  // from the real catalog so nothing charged is trusted from the client.
  const currency = getCheckoutCurrency(shipping.country);
  const stripeCurrency = currency.toLowerCase();
  const products = await getAllProducts();
  const settings = await getStoreSettings();
  validateCheckoutContact(body);
  validateCheckoutItems(items, products, currency);

  // The discount percent is never taken from the client — only the code is.
  // Reject stale codes so the customer can review the revised total first.
  const discountPercent = discountCode
    ? (await validateCouponCode(discountCode)).discountPercent
    : 0;

  if (discountCode && discountPercent === 0) return NextResponse.json({ error: "This discount code is no longer valid. Remove it or choose another code." }, { status: 400 });
  const orderItems = buildOrderItems(items, currency, products, discountPercent);
  const { subtotal, shipping: shippingCost, tax, total, discount } = calculateOrderTotals(
    items,
    currency,
    products,
    settings,
    discountPercent,
  );

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems.map((item) => ({
    price_data: {
      currency: stripeCurrency,
      product_data: {
        name: item.product_name,
        description: `Size ${item.size} · ${item.color}`,
      },
      unit_amount: Math.round(item.unit_price * 100),
    },
    quantity: item.quantity,
  }));

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: stripeCurrency,
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  if (tax > 0) {
    lineItems.push({
      price_data: {
        currency: stripeCurrency,
        product_data: { name: "VAT" },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });
  }

  if (currency === "NGN") throw new Error("Use Paystack for NGN checkout.");
  const snapshotId = await saveCheckoutSnapshot("stripe", {
    status: "success", currency, customerEmail: email, customerName: customer.fullName,
    customerPhone: customer.phone, shippingAddress: { ...shipping, fullName: customer.fullName, email, phone: customer.phone },
    orderItems, subtotal, shippingCost, tax, total, discount, discountCode,
  });
  const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      success_url: `${request.nextUrl.origin}/checkout/success?gateway=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/checkout`,
      metadata: { checkout_snapshot_id: snapshotId },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start the Stripe checkout." },
      { status: 500 },
    );
  }
}
