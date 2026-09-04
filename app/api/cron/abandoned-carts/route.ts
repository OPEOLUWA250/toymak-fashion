import { NextRequest, NextResponse } from "next/server";
import { getCartsDueForRecoveryEmail, markRecoveryEmailSent } from "@/lib/server/abandoned-carts";
import { sendAbandonedCartRecoveryEmail } from "@/lib/server/abandoned-cart-email";

/**
 * Pinged on a schedule by Vercel Cron (see vercel.json) — checks for carts
 * abandoned at least an hour ago that haven't already been emailed (or
 * converted, in which case appendServerOrder already deleted the row) and
 * sends each one a recovery email.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  try {
    const dueCarts = await getCartsDueForRecoveryEmail();
    let sent = 0;

    for (const cart of dueCarts) {
      const success = await sendAbandonedCartRecoveryEmail(cart, origin);
      if (success) {
        await markRecoveryEmailSent(cart.id);
        sent += 1;
      }
    }

    return NextResponse.json({ checked: dueCarts.length, sent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Abandoned cart sweep failed." },
      { status: 500 },
    );
  }
}
