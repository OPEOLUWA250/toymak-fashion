import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/admin-auth";
import { getParcel2GoPrepayBalance, parcel2GoConfigured, Parcel2GoRefusal } from "@/lib/server/parcel2go";
import { getParcel2GoBookingSettings, saveParcel2GoBookingSettings } from "@/lib/server/parcel2go-booking";

export const dynamic = "force-dynamic";

/** The Parcel2Go booking settings for the admin Settings page, with the prepay balance. */
export const GET = adminRoute(async () => {
  try {
    const connected = parcel2GoConfigured();
    const [settings, prepayBalance] = await Promise.all([
      getParcel2GoBookingSettings(),
      connected ? getParcel2GoPrepayBalance().catch(() => null) : Promise.resolve(null),
    ]);
    return NextResponse.json({ settings, connected, prepayBalance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the Parcel2Go settings." }, { status: 500 });
  }
});

export const PUT = adminRoute(async (request: NextRequest) => {
  try {
    const settings = await saveParcel2GoBookingSettings(await request.json().catch(() => null));
    return NextResponse.json({ settings });
  } catch (error) {
    const status = error instanceof Parcel2GoRefusal ? 400 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the Parcel2Go settings." }, { status });
  }
});
