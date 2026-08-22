import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { Address } from "@/lib/types";

interface CheckoutRequestBody {
  email: string;
  country: string;
  items: { product_id: string; quantity: number; size: string; color: string }[];
  customer: { fullName: string; phone: string };
  shipping: Omit<Address, "fullName" | "email" | "phone">;
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

  const body = (await request.json()) as CheckoutRequestBody;
  const { email, country, items, customer, shipping, success_url, cancel_url } = body;

  if (!email || !items?.length || !customer?.fullName || !shipping?.street) {
    return NextResponse.json(
      { error: "Missing required checkout details." },
      { status: 400 },
    );
  }

  // Currency is always GBP for Stripe here — recompute everything server-side
  // from the mock catalog so nothing charged is trusted from the client.
  const orderItems = buildOrderItems(items, "GBP");
  const { shipping: shippingCost, tax } = calculateOrderTotals(items, "GBP", country);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems.map((item) => ({
    price_data: {
      currency: "gbp",
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
        currency: "gbp",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  if (tax > 0) {
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: { name: "VAT" },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });
  }

  const stripe = new Stripe(secretKey);

  try {
    // Metadata values must each be short, flat strings (Stripe's limit is
    // 500 chars per value) — we store compact item refs and re-derive
    // names/prices from the mock catalog again on verify, same as the
    // Paystack route, rather than round-tripping priced data through it.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email,
      success_url,
      cancel_url,
      metadata: {
        customer_name: customer.fullName,
        customer_phone: customer.phone,
        shipping_json: JSON.stringify(shipping),
        items_json: JSON.stringify(
          items.map((item) => ({
            i: item.product_id,
            q: item.quantity,
            s: item.size,
            c: item.color,
          })),
        ),
      },
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
