"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface WishlistContextType {
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

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);

    if (savedWishlist) {
      try {
        setProductIds(JSON.parse(savedWishlist));
      } catch (error) {
        console.error("[v0] Error loading wishlist:", error);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
    }
  }, [productIds, isHydrated]);

  const value = useMemo<WishlistContextType>(
    () => ({
      productIds,
      addToWishlist: (productId: string) => {
        setProductIds((current) =>
          current.includes(productId) ? current : [...current, productId],
        );
      },
      removeFromWishlist: (productId: string) => {
        setProductIds((current) => current.filter((id) => id !== productId));
      },
      isInWishlist: (productId: string) => productIds.includes(productId),
      clearWishlist: () => setProductIds([]),
    }),
    [productIds],
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
