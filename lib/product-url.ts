import type { Product } from "./types";

type ProductRef = Pick<Product, "id" | "name">;

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/**
 * Product pages live at /product/<name-slug>-<id>: the name gives search
 * engines and shoppers a readable URL, the id keeps it unique and stable.
 */
export function productSlug(product: ProductRef): string {
  const name = slugify(product.name);
  return name ? `${name}-${product.id}` : product.id;
}

export function productPath(product: ProductRef): string {
  return `/product/${encodeURIComponent(productSlug(product))}`;
}

/**
 * Finds the product a URL segment refers to: the current slug, a bare id
 * (links in older emails), or an outdated slug after a rename. The caller
 * redirects anything but the current slug.
 */
export function findProductBySlug<T extends ProductRef>(products: T[], segment: string): T | undefined {
  return products
    .filter((p) => segment === p.id || segment.endsWith(`-${p.id}`))
    .sort((a, b) => b.id.length - a.id.length)[0];
}
