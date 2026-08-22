"use client";

import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Product } from "@/lib/types";

type StockStatus = "all" | "in-stock" | "low" | "out";

function getStatus(product: Product): Exclude<StockStatus, "all"> {
  if (product.stock_qty <= 0) return "out";
  if (product.stock_qty <= product.low_stock_threshold) return "low";
  return "in-stock";
}

export function InventoryView({ products }: { products: Product[] }) {
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");

  const lowStockCount = products.filter((p) => getStatus(p) === "low").length;
  const outOfStockCount = products.filter((p) => getStatus(p) === "out").length;

  const filtered = useMemo(() => {
    return [...products]
      .filter((p) => statusFilter === "all" || getStatus(p) === statusFilter)
      .sort((a, b) => a.stock_qty - b.stock_qty);
  }, [products, statusFilter]);

  return (
    <div className="space-y-6">
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm leading-6">
            {outOfStockCount > 0 && (
              <>
                <strong>{outOfStockCount}</strong> product{outOfStockCount === 1 ? " is" : "s are"} out of
                stock.{" "}
              </>
            )}
            {lowStockCount > 0 && (
              <>
                <strong>{lowStockCount}</strong> product{lowStockCount === 1 ? " is" : "s are"} at or below
                its reorder threshold.
              </>
            )}
          </p>
        </div>
      )}

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Inventory</h2>
            <p className="text-sm text-neutral-500">Stock levels across the catalog</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { label: "All", value: "all" },
                { label: "In stock", value: "in-stock" },
                { label: "Low stock", value: "low" },
                { label: "Out of stock", value: "out" },
              ] as { label: string; value: StockStatus }[]
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  statusFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <div className="hidden grid-cols-[1.6fr_0.8fr_0.9fr_0.9fr_1.2fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 sm:grid">
            <span>Product</span>
            <span>SKU</span>
            <span>Stock Qty</span>
            <span>Reorder At</span>
            <span>Level</span>
          </div>

          <div className="divide-y divide-neutral-200 bg-white">
            {filtered.map((product) => {
              const status = getStatus(product);
              const ratio = Math.min((product.stock_qty / 200) * 100, 100);
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[1.6fr_0.8fr_0.9fr_0.9fr_1.2fr] sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <p className="truncate text-sm font-medium text-neutral-900">{product.name}</p>
                  </div>
                  <p className="text-sm text-neutral-600">{product.sku}</p>
                  <p className="text-sm font-semibold text-neutral-900">{product.stock_qty}</p>
                  <p className="text-sm text-neutral-500">{product.low_stock_threshold}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${
                          status === "out"
                            ? "bg-neutral-400"
                            : status === "low"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        status === "out"
                          ? "text-neutral-500"
                          : status === "low"
                            ? "text-amber-700"
                            : "text-emerald-700"
                      }`}
                    >
                      {status === "out" ? "Out" : status === "low" ? "Low" : "Healthy"}
                    </span>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-neutral-500">
                No products match that filter.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
