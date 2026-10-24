"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CATEGORIES } from "./categories";
import type { Category } from "./types";

// Module-level cache shared by every useCategories() caller, same pattern as
// use-settings.ts, so the shop and admin screens fetch the list once.
let categoriesCache: Category[] | null = null;
let categoriesPromise: Promise<Category[]> | null = null;
const listeners = new Set<(categories: Category[]) => void>();

function fetchCategories(): Promise<Category[]> {
  if (categoriesCache) return Promise.resolve(categoriesCache);
  if (!categoriesPromise) {
    // The public list is CDN-cached for a minute; the dashboard reads it fresh.
    const url = window.location.pathname.startsWith("/admin") ? "/api/admin/categories" : "/api/categories";
    categoriesPromise = fetch(url)
      .then((response) => response.json())
      .then((data: { categories?: Category[] }) => {
        if (!data.categories) throw new Error("No categories");
        categoriesCache = data.categories;
        return data.categories;
      })
      .catch(() => {
        categoriesPromise = null;
        return DEFAULT_CATEGORIES;
      });
  }
  return categoriesPromise;
}

/** Called after an admin edit so every mounted useCategories() shows the new list. */
export function setCategoriesCache(categories: Category[]) {
  categoriesCache = categories;
  categoriesPromise = Promise.resolve(categories);
  listeners.forEach((listener) => listener(categories));
}

/** The admin-managed category list (GET /api/categories), starting from the built-in defaults. */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() => categoriesCache ?? DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(!categoriesCache);

  useEffect(() => {
    let cancelled = false;
    listeners.add(setCategories);
    fetchCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      listeners.delete(setCategories);
    };
  }, []);

  return { categories, isLoading };
}
