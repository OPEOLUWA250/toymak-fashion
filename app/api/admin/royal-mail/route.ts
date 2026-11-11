import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/admin-auth";
import { listRoyalMailServices, royalMailConfigured, type RoyalMailService } from "@/lib/server/royal-mail";
import { getRoyalMailSettings, saveRoyalMailSettings } from "@/lib/server/royal-mail-orders";

export const dynamic = "force-dynamic";

/**
 * Settings -> Royal Mail: the saved settings, whether the API key is set,
 * and the services the Click & Drop account offers (to pick from).
 */
export const GET = adminRoute(async () => {
  try {
    const connected = royalMailConfigured();
    let services: RoyalMailService[] | null = null;
    let servicesError: string | null = null;
    if (connected) {
      try {
        services = await listRoyalMailServices();
      } catch (error) {
        servicesError = error instanceof Error ? error.message : "Could not reach Royal Mail.";
      }
    }
    return NextResponse.json({ settings: await getRoyalMailSettings(), connected, services, servicesError });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the Royal Mail settings." }, { status: 500 });
  }
});

export const PUT = adminRoute(async (request: NextRequest) => {
  try {
    const settings = await saveRoyalMailSettings(await request.json().catch(() => null));
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the Royal Mail settings." }, { status: 500 });
  }
});
