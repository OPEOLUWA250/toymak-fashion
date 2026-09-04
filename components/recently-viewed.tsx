"use client";

import { useProducts } from "@/lib/use-products";
import { useRecentlyViewedIds } from "@/lib/use-recently-viewed";
import { ProductCard } from "@/components/product-card";

export function RecentlyViewed({ excludeId, title = "Recently Viewed" }: { excludeId?: string; title?: string }) {
  const { products } = useProducts();
  const ids = useRecentlyViewedIds(excludeId);

  const viewedProducts = ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .slice(0, 4);

  // Nothing yet for this visitor (or nothing left once the current product
  // and any since-deleted products are filtered out) — render nothing
  // rather than an empty section or placeholder content.
  if (viewedProducts.length === 0) return null;

  return (
    <section className="mt-20 border-t pt-20">
      <h2 className="mb-8 text-3xl font-bold text-neutral">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {viewedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
