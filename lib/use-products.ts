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
 * code directly. Starts from the server-rendered catalog when the page
 * passes one (then refreshes it quietly), otherwise from an empty array.
 */
export function useProducts(initialProducts?: Product[]) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [isLoading, setIsLoading] = useState(!initialProducts?.length);
  const [error, setError] = useState<string | null>(null);
  // A failed refresh keeps the server-rendered catalog on screen.
  const [hasInitialProducts] = useState(!!initialProducts?.length);

  useEffect(() => {
    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled && !hasInitialProducts) setError(message);
    };

    fetch("/api/products")
      .then((response) => response.json())
      .then((data: { products?: Product[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) {
          fail(data.error);
          return;
        }
        setProducts(reviveDates(data.products ?? []));
      })
      .catch((err) => fail(err instanceof Error ? err.message : "Failed to load products"))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasInitialProducts]);

  return { products, isLoading, error };
}
