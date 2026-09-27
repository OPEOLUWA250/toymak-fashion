"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface WishlistContextType {
  syncError: string | null;
  productIds: string[];
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

const WISHLIST_STORAGE_KEY = "toymak-wishlist";

// Wishlists are kept on this device only — there are no customer accounts
// to sync them to.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
      setProductIds(Array.isArray(saved) ? saved.filter((x) => typeof x === "string") : []);
    } catch {
      // Unreadable or blocked storage just means an empty wishlist.
    }
  }, []);

  const persist = (next: string[]) => {
    setProductIds(next);
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      setSyncError(null);
    } catch {
      setSyncError("Your browser blocked saving your wishlist, so it won't be kept after you leave.");
    }
  };

  const value = useMemo<WishlistContextType>(
    () => ({
      productIds, syncError,
      addToWishlist: (productId: string) => persist(productIds.includes(productId) ? productIds : [...productIds, productId]),
      removeFromWishlist: (productId: string) => persist(productIds.filter(id => id !== productId)),
      isInWishlist: (productId: string) => productIds.includes(productId),
      clearWishlist: () => persist([]),
    }),
    [productIds, syncError],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }

  return context;
}
