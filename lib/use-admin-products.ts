"use client";

import { useEffect, useMemo, useState } from "react";
import { Product } from "./types";

function reviveDates(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    created_at: new Date(product.created_at),
    updated_at: new Date(product.updated_at),
  }));
}

/**
 * Admin-facing product catalog — backed by the same GET /api/products the
 * storefront reads, plus /api/admin/products for mutations. Stock
 * decrement is no longer handled here: it happens server-side, exactly
 * once per confirmed order, inside appendServerOrder (see
 * lib/server/order-store.ts) — regardless of which browser tab (if any)
 * is open when the order lands.
 */
export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load products. Please refresh to try again.");
        return response.json();
      })
      .then((data: { products?: Product[] }) => {
        setProducts(reviveDates(data.products ?? []));
      })
      .catch(() => setError("Could not load products. Please refresh to try again."))
      .finally(() => setIsLoading(false));
  }, []);

  const actions = useMemo(
    () => ({
      addProduct: async (product: Product) => {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        const data = (await response.json()) as { product?: Product; error?: string };
        if (!response.ok || !data.product) throw new Error(data.error ?? "Could not add product. Please try again.");
        if (data.product) {
          const created = reviveDates([data.product])[0];
          setProducts((current) => [created, ...current]);
        }
      },
      updateProduct: async (product: Product) => {
        const response = await fetch(`/api/admin/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        const data = (await response.json()) as { product?: Product; error?: string };
        if (!response.ok || !data.product) throw new Error(data.error ?? "Could not save product. Please try again.");
        if (data.product) {
          const updated = reviveDates([data.product])[0];
          setProducts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
        }
      },
      removeProduct: async (productId: string) => {
        const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Could not delete product. Please try again.");
        setProducts((current) => current.filter((p) => p.id !== productId));
      },
    }),
    [],
  );

  return { products, isLoading, error, ...actions };
}
