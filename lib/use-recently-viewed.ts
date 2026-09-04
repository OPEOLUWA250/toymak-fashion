"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "toymak-recently-viewed";
const MAX_ITEMS = 12;

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Called once per product-page visit (from product-client.tsx). Plain
 * function rather than a hook — it's a one-off write, not something a
 * component needs to re-render on. Most-recent-first, deduped, capped.
 */
export function recordProductView(productId: string) {
  const current = readStoredIds();
  const next = [productId, ...current.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, quota) — recently-viewed is a
    // convenience feature, silently skipping it is fine.
  }
}

/**
 * Read-only view of the list, for the "Recently Viewed" row itself.
 * excludeId keeps a product page from listing the very product you're on.
 */
export function useRecentlyViewedIds(excludeId?: string): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readStoredIds().filter((id) => id !== excludeId));
  }, [excludeId]);

  return ids;
}
