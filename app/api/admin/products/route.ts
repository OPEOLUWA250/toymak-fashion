import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/server/products";
import { Product } from "@/lib/types";

export async function POST(request: NextRequest) {
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
}
