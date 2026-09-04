import { NextRequest, NextResponse } from "next/server";
import { validateCouponCode } from "@/lib/server/signups";

/**
 * Lets the checkout page show "code applied" before payment, without ever
 * trusting that client-side check for the actual charge — /api/stripe/checkout
 * and /api/paystack/initialize both re-validate the code themselves from the
 * same source of truth.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { code?: string };
  const code = (body.code ?? "").trim();

  if (!code) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  try {
    const { valid, discountPercent } = await validateCouponCode(code);
    if (!valid) {
      return NextResponse.json(
        { valid: false, error: "That code isn't valid, or has already been used." },
        { status: 200 },
      );
    }
    return NextResponse.json({ valid: true, discountPercent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check that code." },
      { status: 500 },
    );
  }
}
