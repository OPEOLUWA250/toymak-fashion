import { NextRequest, NextResponse } from "next/server";
import { createProduct, getAllProducts } from "@/lib/server/products";
import { Product } from "@/lib/types";
import { adminRoute } from "@/lib/server/admin-auth";

export const POST = adminRoute(async (request: NextRequest) => {
  try {
    const product = (await request.json()) as Product;
    const created = await createProduct({
      ...product,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return NextResponse.json({ product: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 },
    );
  }
});

export const GET = adminRoute(async () => {
  try { return NextResponse.json({ products: await getAllProducts(true) }); }
  catch { return NextResponse.json({ error: "Unable to load products." }, { status: 500 }); }
});
