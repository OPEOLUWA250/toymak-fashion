"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Product, ProductCategory } from "@/lib/types";
import { ProductFormModal } from "./product-form-modal";

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
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: {
  products: Product[];
  search: string;
  onSearchChange: (value: string) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [formTarget, setFormTarget] = useState<"add" | Product | null>(null);

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

  const handleDelete = (product: Product) => {
    if (confirm(`Delete "${product.name}"? This can't be undone.`)) {
      onDeleteProduct(product.id);
    }
  };

  const handleSave = (product: Product) => {
    if (formTarget === "add") {
      onAddProduct(product);
    } else {
      onUpdateProduct(product);
    }
    setFormTarget(null);
  };

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Products</h2>
            <p className="text-sm text-neutral-500">The catalog currently live on the storefront</p>
          </div>
          <button
            type="button"
            onClick={() => setFormTarget("add")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus size={16} />
            Add Product
          </button>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-left">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Product
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  SKU
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Category
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Price
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filtered.map((product) => {
                const outOfStock = product.stock_qty <= 0;
                const lowStock = !outOfStock && product.stock_qty <= product.low_stock_threshold;
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {product.name}
                          </p>
                          {product.featured && (
                            <span className="text-[11px] font-medium text-primary">Featured</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-neutral-600">{product.sku}</td>
                    <td className="px-4 py-4 align-middle text-sm text-neutral-600">
                      {categoryLabels[product.category]}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm font-semibold text-neutral-900">
                      £{product.price_gbp.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <span
                        className={`inline-flex w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          outOfStock
                            ? "bg-neutral-200 text-neutral-600"
                            : lowStock
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {outOfStock
                          ? "Out of stock"
                          : lowStock
                            ? `${product.stock_qty} · low`
                            : `${product.stock_qty} in stock`}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/product/${product.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          View
                          <ExternalLink size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setFormTarget(product)}
                          className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            No products match that search or filter.
          </p>
        )}
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Showing {filtered.length} of {products.length} products
      </p>

      {formTarget !== null && (
        <ProductFormModal
          product={formTarget === "add" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
