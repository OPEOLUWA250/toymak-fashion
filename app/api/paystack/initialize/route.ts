import { NextRequest, NextResponse } from "next/server";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { Address } from "@/lib/types";

const PAYSTACK_API = "https://api.paystack.co";

interface InitializeRequestBody {
  email: string;
  country: string;
  items: { product_id: string; quantity: number; size: string; color: string }[];
  customer: { fullName: string; phone: string };
  shipping: Omit<Address, "fullName" | "email" | "phone">;
  callback_url: string;
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Paystack isn't configured yet. Add PAYSTACK_SECRET_KEY to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as InitializeRequestBody;
  const { email, country, items, customer, shipping, callback_url } = body;

  if (!email || !items?.length || !customer?.fullName || !shipping?.street) {
    return NextResponse.json(
      { error: "Missing required checkout details." },
      { status: 400 },
    );
  }

  // Currency is always NGN for Paystack — recompute everything server-side
  // from the mock catalog so nothing charged is trusted from the client.
  const orderItems = buildOrderItems(items, "NGN");

  const { subtotal, shipping: shippingCost, tax, total } = calculateOrderTotals(
    items,
    "NGN",
    country,
  );

  const reference = `tmk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const paystackResponse = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(total * 100), // kobo
      currency: "NGN",
      reference,
      callback_url,
      metadata: {
        customer_name: customer.fullName,
        customer_phone: customer.phone,
        shipping_address: { ...shipping, fullName: customer.fullName, email, phone: customer.phone },
        order_items: orderItems,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,
      },
    }),
  });

  const data = await paystackResponse.json();

  if (!paystackResponse.ok || !data.status) {
    return NextResponse.json(
      { error: data.message || "Failed to start the Paystack transaction." },
      { status: paystackResponse.status || 500 },
    );
  }

  return NextResponse.json(data.data);
}
