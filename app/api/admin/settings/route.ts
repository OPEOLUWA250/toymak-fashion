import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/server/settings";
import { adminRoute } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

/** Full, uncached settings for the admin Settings page, including the order-notification email. */
export const GET = adminRoute(async () => {
  try {
    return NextResponse.json({ settings: await getStoreSettings() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 },
    );
  }
});
