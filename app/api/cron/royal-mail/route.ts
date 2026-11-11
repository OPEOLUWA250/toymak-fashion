import { NextRequest, NextResponse } from "next/server";
import { sweepRoyalMailSends, sweepRoyalMailTracking } from "@/lib/server/royal-mail-orders";

// Sending is one or two Royal Mail calls per order, but only for orders the
// instant send missed; tracking numbers come back in one call per 100 orders.
export const maxDuration = 60;

/**
 * Sends any recent order that automatic sending to Click & Drop missed,
 * picks up the tracking numbers of labels printed since, and emails those
 * customers. Run daily by Vercel Cron (vercel.json); any outside scheduler
 * can call it more often with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sends = await sweepRoyalMailSends().catch((error) => {
      console.error("Royal Mail send sweep failed:", error);
      return { tried: 0, sent: 0, error: error instanceof Error ? error.message : "failed" };
    });
    return NextResponse.json({ sends, ...(await sweepRoyalMailTracking()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Royal Mail check failed." },
      { status: 500 },
    );
  }
}
