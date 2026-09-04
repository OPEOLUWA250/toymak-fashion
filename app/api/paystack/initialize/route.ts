import { NextRequest, NextResponse } from "next/server";
import { buildOrderItems, calculateOrderTotals } from "@/lib/pricing";
import { getAllProducts } from "@/lib/server/products";
import { getStoreSettings } from "@/lib/server/settings";
import { validateCouponCode } from "@/lib/server/signups";
import { Address } from "@/lib/types";

const PAYSTACK_API = "https://api.paystack.co";

interface InitializeRequestBody {
  email: string;
  country: string;
  items: { product_id: string; quantity: number; size: string; color: string }[];
  customer: { fullName: string; phone: string };
  shipping: Omit<Address, "fullName" | "email" | "phone">;
  discountCode?: string;
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
  const { email, items, customer, shipping, discountCode, callback_url } = body;

  if (!email || !items?.length || !customer?.fullName || !shipping?.street) {
    return NextResponse.json(
      { error: "Missing required checkout details." },
      { status: 400 },
    );
  }

  // Currency is always NGN for Paystack — recompute everything server-side
  // from the real catalog so nothing charged is trusted from the client.
  const products = await getAllProducts();
  const settings = await getStoreSettings();

  // The discount percent is never taken from the client — only the code is.
  // An invalid/already-used code is silently ignored here (0% applied) so a
  // stale code left in the field doesn't block checkout.
  const discountPercent = discountCode
    ? (await validateCouponCode(discountCode)).discountPercent
    : 0;

  const orderItems = buildOrderItems(items, "NGN", products, discountPercent);

  const { subtotal, shipping: shippingCost, tax, total, discount } = calculateOrderTotals(
    items,
    "NGN",
    products,
    settings,
    discountPercent,
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
        discount,
        ...(discountPercent > 0 && discountCode ? { discount_code: discountCode.trim().toUpperCase() } : {}),
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
