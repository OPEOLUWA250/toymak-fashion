import type { Category } from "./types";

/**
 * The original five categories. Used if the product_categories table is
 * missing, and while the live list is still loading in the browser.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "shapewear", label: "Shapewear" },
  { id: "waist-trainer", label: "Waist Trainers" },
  { id: "bra", label: "Bras" },
  { id: "tops", label: "Tops" },
  { id: "accessories", label: "Accessories" },
];

export const MAX_CATEGORY_LABEL_LENGTH = 60;

/** "Waist Trainers" -> "waist-trainers". The slug is what shop URLs use. */
export function categorySlug(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Display name for a category id, falling back to a tidied slug. */
export function categoryLabel(categories: Category[], id: string): string {
  return (
    categories.find((category) => category.id === id)?.label ??
    id.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
