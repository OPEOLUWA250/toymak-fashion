import { getSupabaseAdmin } from "./supabase";
import { Category } from "../types";
import { DEFAULT_CATEGORIES, MAX_CATEGORY_LABEL_LENGTH, categorySlug } from "../categories";

const SETUP_HINT = "The product_categories table is missing from the database, so categories can't be changed.";

// PostgREST/Postgres codes for "the product_categories table doesn't exist yet".
function isMissingTable(error: { code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

function cleanLabel(label: unknown): string {
  const value = typeof label === "string" ? label.trim().replace(/\s+/g, " ") : "";
  if (!value || value.length > MAX_CATEGORY_LABEL_LENGTH) {
    throw new Error(`Enter a category name of up to ${MAX_CATEGORY_LABEL_LENGTH} characters.`);
  }
  if (!categorySlug(value)) throw new Error("Use at least one letter or number in the category name.");
  return value;
}

/** Categories in display order. Falls back to the built-in list if the table is missing. */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("product_categories")
    .select("id, label")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return DEFAULT_CATEGORIES;
    throw new Error(`Failed to load categories: ${error.message}`);
  }
  return data as Category[];
}

export async function createCategory(label: unknown): Promise<Category> {
  const name = cleanLabel(label);
  const db = getSupabaseAdmin();
  const { data: last } = await db
    .from("product_categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("product_categories")
    .insert({ id: categorySlug(name), label: name, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id, label")
    .single();

  if (error) {
    if (isMissingTable(error)) throw new Error(SETUP_HINT);
    if (error.code === "23505") throw new Error(`A category called "${name}" already exists.`);
    throw new Error(`Failed to add category: ${error.message}`);
  }
  return data as Category;
}

/** Renames a category. Its id stays the same so shop links keep working. */
export async function renameCategory(id: string, label: unknown): Promise<Category> {
  const name = cleanLabel(label);
  const { data, error } = await getSupabaseAdmin()
    .from("product_categories")
    .update({ label: name })
    .eq("id", id)
    .select("id, label")
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) throw new Error(SETUP_HINT);
    throw new Error(`Failed to rename category: ${error.message}`);
  }
  if (!data) throw new Error("That category no longer exists.");
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { count, error: countError } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", id);
  if (countError) throw new Error(`Failed to check category: ${countError.message}`);
  if (count) {
    throw new Error(
      `${count} product${count === 1 ? " is" : "s are"} still in this category. Move ${count === 1 ? "it" : "them"} to another category first.`,
    );
  }

  const { error } = await db.from("product_categories").delete().eq("id", id);
  if (error) {
    if (isMissingTable(error)) throw new Error(SETUP_HINT);
    // Foreign key: a product was added to the category in the meantime.
    if (error.code === "23503") throw new Error("Products are still in this category. Move them first.");
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}
