import { NextRequest, NextResponse } from "next/server";
import { createCategory, getCategories } from "@/lib/server/categories";
import { adminRoute } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

/** Uncached list for admin screens, so a category added a moment ago always shows. */
export const GET = adminRoute(async () => {
  try {
    return NextResponse.json({ categories: await getCategories() });
  } catch {
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 });
  }
});

export const POST = adminRoute(async (request: NextRequest) => {
  try {
    const { label } = (await request.json()) as { label?: unknown };
    return NextResponse.json({ category: await createCategory(label) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add category" },
      { status: 400 },
    );
  }
});
