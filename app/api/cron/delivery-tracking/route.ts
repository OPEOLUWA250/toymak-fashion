import { NextRequest, NextResponse } from "next/server";
import { sweepDeliveryTracking } from "@/lib/server/delivery-tracking";
import { sweepParcel2GoBookings } from "@/lib/server/parcel2go-booking";

// One Parcel2Go request per parcel, up to 8 seconds each (booking takes a
// few more, but only for orders the instant booking missed).
export const maxDuration = 60;

/**
 * Books any recent order that automatic Parcel2Go booking missed, then
 * checks every undelivered order with a Parcel2Go reference and sends the
 * out-for-delivery and delivered emails. Run daily by Vercel Cron
 * (vercel.json); any outside scheduler can call it more often with
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const bookings = await sweepParcel2GoBookings().catch((error) => {
      console.error("Parcel2Go booking sweep failed:", error);
      return { tried: 0, booked: 0, error: error instanceof Error ? error.message : "failed" };
    });
    return NextResponse.json({ bookings, ...(await sweepDeliveryTracking()) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delivery tracking check failed." },
      { status: 500 },
    );
  }
}
