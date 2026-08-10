"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { Product, ProductCategory } from "@/lib/types";

const categoryLabels: Record<ProductCategory, string> = {
  shapewear: "Shapewear",
  "waist-trainer": "Waist Trainer",
  bra: "Bra",
  tops: "Tops",
  accessories: "Accessories",
};

export function ProductsView({
  products,
  search,
  onSearchChange,
}: {
  products: Product[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, categoryFilter, search]);

  return (
    <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)] lg:p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Products</h2>
          <p className="text-sm text-neutral-500">The catalog currently live on the storefront</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                categoryFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
            <Search size={14} className="text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name or SKU"
              className="w-56 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200">
        <div className="hidden grid-cols-[1.6fr_0.8fr_0.9fr_0.7fr_0.7fr_auto] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
          <span>Product</span>
          <span>SKU</span>
          <span>Category</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Storefront</span>
        </div>

        <div className="divide-y divide-neutral-200 bg-white">
          {filtered.map((product) => {
            const outOfStock = product.stock_qty <= 0;
            const lowStock = !outOfStock && product.stock_qty <= product.low_stock_threshold;
            return (
              <div
                key={product.id}
                className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[1.6fr_0.8fr_0.9fr_0.7fr_0.7fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
                    {product.featured && (
                      <span className="text-[11px] font-medium text-primary">Featured</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-neutral-600">{product.sku}</p>
                <p className="text-sm text-neutral-600">{categoryLabels[product.category]}</p>
                <p className="text-sm font-semibold text-neutral-900">£{product.price_gbp.toFixed(2)}</p>
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    outOfStock
                      ? "bg-neutral-200 text-neutral-600"
                      : lowStock
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {outOfStock ? "Out of stock" : lowStock ? `${product.stock_qty} · low` : `${product.stock_qty} in stock`}
                </span>
                <Link
                  href={`/product/${product.id}`}
                  target="_blank"
                  className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  View
                  <ExternalLink size={13} />
                </Link>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No products match that search or filter.
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Showing {filtered.length} of {products.length} products
      </p>
    </div>
  );
}
