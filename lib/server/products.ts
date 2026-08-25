import { getSupabaseAdmin } from "./supabase";
import { Product } from "../types";

interface ProductRow {
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
  return {
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
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await getSupabaseAdmin().from("products").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Failed to load product ${id}: ${error.message}`);
  return data ? rowToProduct(data as ProductRow) : null;
}

export async function createProduct(product: Product): Promise<Product> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .insert(productToRow(product))
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

/**
 * Depletes stock for every line item in a confirmed order. Not run inside a
 * single transaction (Supabase's JS client doesn't expose multi-statement
 * transactions) — each item is read-then-written independently, same
 * consistency guarantee the old client-side version had. Good enough at
 * this catalog's order volume; a Postgres RPC would be the real fix if
 * concurrent purchases of the same low-stock item ever become common.
 */
export async function decrementProductStock(
  items: { product_id: string; quantity: number }[],
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const item of items) {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock_qty")
      .eq("id", item.product_id)
      .maybeSingle();

    if (fetchError || !product) continue; // product may have been removed since the order was placed

    const newStock = Math.max(0, product.stock_qty - item.quantity);
    await supabase.from("products").update({ stock_qty: newStock }).eq("id", item.product_id);
  }
}
