import { NextRequest, NextResponse } from "next/server";
import { sweepDeliveryTracking } from "@/lib/server/delivery-tracking";

// One Parcel2Go request per parcel, up to 8 seconds each.
export const maxDuration = 60;

/**
 * Checks every shipped, undelivered order with a Parcel2Go reference and
 * sends the out-for-delivery and delivered emails. Run daily by Vercel Cron
 * (vercel.json); any outside scheduler can call it more often with
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await sweepDeliveryTracking());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delivery tracking check failed." },
      { status: 500 },
    );
  }
}
