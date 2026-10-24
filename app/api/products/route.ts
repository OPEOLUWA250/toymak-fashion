import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/server/products";
import { PUBLIC_CDN_CACHE_HEADERS } from "@/lib/server/cdn-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products }, { headers: PUBLIC_CDN_CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load products" },
      { status: 500 },
    );
  }
}
