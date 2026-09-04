import { NextRequest, NextResponse } from "next/server";
import { getStoreSettings, updateStoreSettings, StoreSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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
}
