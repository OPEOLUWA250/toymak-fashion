import { NextRequest, NextResponse } from "next/server";
import { validateCouponCode } from "@/lib/server/signups";

/**
 * Lets the checkout page show "code applied" before payment, without ever
 * trusting that client-side check for the actual charge — /api/stripe/checkout
 * and /api/paystack/initialize both re-validate the code themselves from the
 * same source of truth.
 *
 * The answer is the same whether a code doesn't exist, was used, or belongs
 * to another email, so this can't be used to find out whose code is whose.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { code?: unknown; email?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!code) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Enter your email address first." }, { status: 400 });
  }

  try {
    const { valid, discountPercent, reason } = await validateCouponCode(code, email);
    if (!valid) {
      return NextResponse.json(
        {
          valid: false,
          error: reason === "already-ordered"
            ? "Welcome codes are for your first order only, and this email address has ordered with us before."
            : "That code isn't valid for this email address, or has already been used. Codes only work with the email they were sent to.",
        },
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
