import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/categories";
import { PUBLIC_CDN_CACHE_HEADERS } from "@/lib/server/cdn-cache";

export const dynamic = "force-dynamic";

// Public and CDN-cached, for the shop's category filter. Admin screens read
// the uncached GET /api/admin/categories.
export async function GET() {
  try {
    return NextResponse.json({ categories: await getCategories() }, { headers: PUBLIC_CDN_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 });
  }
}
