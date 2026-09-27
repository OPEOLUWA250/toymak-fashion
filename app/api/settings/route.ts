import { NextRequest, NextResponse } from "next/server";
import { getStoreSettings, updateStoreSettings, StoreSettings } from "@/lib/server/settings";
import { adminRoute, getAdmin } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

// Public — the storefront needs tax/shipping/banner settings — but the
// admin's order-notification email is only returned to a signed-in admin.
export async function GET() {
  try {
    const settings = await getStoreSettings();
    const isAdmin = !!(await getAdmin());
    return NextResponse.json({ settings: isAdmin ? settings : { ...settings, orderNotificationEmail: "" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 },
    );
  }
}

export const PUT = adminRoute(async (request: NextRequest) => {
  try {
    const settings = (await request.json()) as StoreSettings;
    const updated = await updateStoreSettings(settings);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 },
    );
  }
});
