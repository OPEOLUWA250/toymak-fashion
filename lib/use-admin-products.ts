"use client";

import { useEffect, useMemo, useState } from "react";
import { Product } from "./types";
import { mockProducts } from "./mock-products";

const STORAGE_KEY = "toymak-admin-products";

function reviveDates(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    created_at: new Date(product.created_at),
    updated_at: new Date(product.updated_at),
  }));
}

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProducts(reviveDates(JSON.parse(saved)));
      } catch {
        // ignore corrupt local data, fall back to mock seed
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, isHydrated]);

  const actions = useMemo(
    () => ({
      addProduct: (product: Product) => {
        setProducts((current) => [product, ...current]);
      },
      updateProduct: (product: Product) => {
        setProducts((current) =>
          current.map((p) => (p.id === product.id ? { ...product, updated_at: new Date() } : p)),
        );
      },
      removeProduct: (productId: string) => {
        setProducts((current) => current.filter((p) => p.id !== productId));
      },
    }),
    [],
  );

  return { products, ...actions };
}
