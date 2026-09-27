import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "./supabase";
import { Product } from "../types";

interface ProductRow {
  status?: Product["status"];
  variants?: Product["variants"];
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  price_gbp: number;
  price_ngn: number;
  price_usd: number | null;
  compare_at_price_gbp: number | null;
  category: Product["category"];
  sizes: string[];
  colors: Product["colors"];
  stock_qty: number;
  low_stock_threshold: number;
  sku: string;
  images: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    status: row.status ?? "active",
    variants: row.variants ?? [],
    id: row.id,
    name: row.name,
    description: row.description,
    longDescription: row.long_description ?? undefined,
    price_gbp: Number(row.price_gbp),
    price_ngn: Number(row.price_ngn),
    price_usd: row.price_usd === null ? undefined : Number(row.price_usd),
    compare_at_price_gbp: row.compare_at_price_gbp === null ? undefined : Number(row.compare_at_price_gbp),
    category: row.category,
    sizes: row.sizes,
    colors: row.colors,
    stock_qty: row.stock_qty,
    low_stock_threshold: row.low_stock_threshold,
    sku: row.sku,
    images: row.images,
    featured: row.featured,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

function productToRow(product: Product) {
  if (!product.name?.trim() || !['active', 'draft', 'archived'].includes(product.status ?? 'active')) throw new Error('Enter a name and valid visibility.');
  for (const value of [product.stock_qty, product.low_stock_threshold]) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Stock quantities must be nonnegative whole numbers.');
  for (const value of [product.price_gbp, product.price_ngn, product.price_usd ?? 0]) if (!Number.isFinite(value) || value < 0) throw new Error('Prices must be nonnegative numbers.');
  const variants = product.variants ?? [];
  const seen = new Set<string>();
  for (const variant of variants) {
    const key = JSON.stringify([variant.size, variant.color]);
    if (seen.has(key) || !Number.isSafeInteger(variant.stock) || variant.stock < 0 || !(product.sizes.length ? product.sizes : ['Not applicable']).includes(variant.size) || !(product.colors.length ? product.colors.map(c => c.name) : ['Default']).includes(variant.color)) throw new Error('Check the size and colour inventory entries.');
    seen.add(key);
  }

  return {
    status: product.status ?? "active",
    variants: product.variants ?? [],
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
    stock_qty: variants.length ? variants.reduce((sum, v) => sum + v.stock, 0) : product.stock_qty,
    low_stock_threshold: product.low_stock_threshold,
    images: product.images,
    featured: product.featured,
  };
}

export async function getAllProducts(includeHidden = false): Promise<Product[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return (data as ProductRow[]).map(rowToProduct).filter(p => includeHidden || p.status === "active");
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await getSupabaseAdmin().from("products").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Failed to load product ${id}: ${error.message}`);
  const product = data ? rowToProduct(data as ProductRow) : null;
  return product?.status === "active" ? product : null;
}

export async function createProduct(product: Product): Promise<Product> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .insert({
      ...productToRow(product),
      sku: `TM-${randomUUID().replaceAll("-", "").toUpperCase()}`,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return rowToProduct(data as ProductRow);
}

export async function updateProduct(product: Product): Promise<Product> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .update(productToRow(product))
    .eq("id", product.id)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update product ${product.id}: ${error.message}`);
  return rowToProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete product ${id}: ${error.message}`);
}

