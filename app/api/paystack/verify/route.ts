import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack isn't configured yet. Add PAYSTACK_SECRET_KEY to .env.local." },
      { status: 500 },
    );
  }

  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const paystackResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );

  const data = await paystackResponse.json();

  if (!paystackResponse.ok || !data.status) {
    return NextResponse.json(
      { error: data.message || "Could not verify this transaction." },
      { status: paystackResponse.status || 500 },
    );
  }

  return NextResponse.json(data.data);
}
