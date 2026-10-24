import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, renameCategory } from "@/lib/server/categories";
import { adminRoute } from "@/lib/server/admin-auth";

export const PATCH = adminRoute(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { label } = (await request.json()) as { label?: unknown };
    return NextResponse.json({ category: await renameCategory(id, label) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename category" },
      { status: 400 },
    );
  }
});

export const DELETE = adminRoute(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 400 },
    );
  }
});
