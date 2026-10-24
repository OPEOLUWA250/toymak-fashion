import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, ProductConflictError, updateProduct } from "@/lib/server/products";
import { Product } from "@/lib/types";
import { adminRoute } from "@/lib/server/admin-auth";

export const PUT = adminRoute(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    // updated_at is the version the admin loaded, sent back unchanged by the form.
    const product = (await request.json()) as Product;
    const updated = await updateProduct({ ...product, id }, new Date(product.updated_at));
    return NextResponse.json({ product: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: error instanceof ProductConflictError ? 409 : 500 },
    );
  }
});

export const DELETE = adminRoute(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product" },
      { status: 500 },
    );
  }
});
