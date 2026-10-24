import { NextRequest, NextResponse } from "next/server";
import {
  claimRecoveryEmail,
  deleteAbandonedCartByEmail,
  getCartsDueForRecoveryEmail,
  hasOrderedSince,
  releaseRecoveryEmail,
} from "@/lib/server/abandoned-carts";
import { sendAbandonedCartRecoveryEmail } from "@/lib/server/abandoned-cart-email";

/**
 * Pinged on a schedule by Vercel Cron (see vercel.json) — checks for carts
 * abandoned at least an hour ago that haven't already been emailed (or
 * converted, in which case appendServerOrder already deleted the row) and
 * sends each one a recovery email. Refuses every request until CRON_SECRET
 * is configured, so nobody else can trigger the emails.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  try {
    const dueCarts = await getCartsDueForRecoveryEmail();
    let sent = 0;

    for (const cart of dueCarts) {
      if (await hasOrderedSince(cart.email, cart.updatedAt)) {
        await deleteAbandonedCartByEmail(cart.email);
        continue;
      }
      if (!(await claimRecoveryEmail(cart.id))) continue;
      const success = await sendAbandonedCartRecoveryEmail(cart, origin).catch(() => false);
      if (success) {
        sent += 1;
      } else {
        await releaseRecoveryEmail(cart.id);
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
