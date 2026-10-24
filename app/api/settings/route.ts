import { NextRequest, NextResponse } from "next/server";
import { getStoreSettings, updateStoreSettings, StoreSettings } from "@/lib/server/settings";
import { adminRoute } from "@/lib/server/admin-auth";
import { PUBLIC_CDN_CACHE_HEADERS } from "@/lib/server/cdn-cache";

export const dynamic = "force-dynamic";

// Public and CDN-cached — the storefront needs tax/shipping/banner settings.
// The response is the same for everyone, so the admin's order-notification
// email is never included; the admin Settings page reads
// GET /api/admin/settings instead.
export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(
      { settings: { ...settings, orderNotificationEmail: "" } },
      { headers: PUBLIC_CDN_CACHE_HEADERS },
    );
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
