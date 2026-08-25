"use client";

import { useEffect, useState } from "react";
import { Product } from "./types";

function reviveDates(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    created_at: new Date(product.created_at),
    updated_at: new Date(product.updated_at),
  }));
}

/**
 * Fetches the live product catalog from GET /api/products (backed by
 * Supabase) — the client-side counterpart to lib/server/products.ts's
 * getAllProducts(), for the "use client" pages that can't call server-only
 * code directly. Starts as an empty array while loading rather than
 * flashing stale data, since there's no local seed to fall back to anymore.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/products")
      .then((response) => response.json())
      .then((data: { products?: Product[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        setProducts(reviveDates(data.products ?? []));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, isLoading, error };
}
