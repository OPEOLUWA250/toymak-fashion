/**
 * One-time migration: copies the 7 products from lib/mock-products.ts into
 * the Supabase `products` table created by supabase/migrations/0001_products.sql.
 * Safe to re-run — upserts on `id`, so it won't create duplicates.
 *
 * Run with: npx tsx scripts/seed-products.ts
 */
import { createClient } from "@supabase/supabase-js";
import { mockProducts } from "../lib/mock-products";
import * as fs from "fs";

function loadEnvLocal() {
  const raw = fs.readFileSync(".env.local", "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(url, serviceRoleKey);

  const rows = mockProducts.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    long_description: product.longDescription ?? null,
    price_gbp: product.price_gbp,
    price_ngn: product.price_ngn,
    price_usd: product.price_usd ?? null,
    compare_at_price_gbp: product.compare_at_price_gbp ?? null,
    category: product.category,
    sizes: product.sizes,
    colors: product.colors,
    stock_qty: product.stock_qty,
    low_stock_threshold: product.low_stock_threshold,
    sku: product.sku,
    images: product.images,
    featured: product.featured,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
  }));

  const { data, error } = await supabase.from("products").upsert(rows, { onConflict: "id" }).select("id");

  if (error) {
    console.error("SEED FAILED:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} products:`, data?.map((r) => r.id).join(", "));
}

main();
