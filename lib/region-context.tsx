"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Currency } from "./types";

const STORAGE_KEY = "toymak-display-currency";

interface RegionContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

/**
 * Purely a browsing preference — what prices LOOK like on cards/product
 * pages/cart. It never decides what a customer is actually charged; that
 * stays entirely down to the shipping country picked at checkout
 * (getCheckoutCurrency), which checkout pre-fills from this preference as a
 * starting point the customer can still change. Defaults to GBP for every
 * visitor until they explicitly switch, same as before this existed.
 */
export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("GBP");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "GBP" || saved === "NGN" || saved === "USD") {
      setCurrencyState(saved);
    }
    setIsHydrated(true);
  }, []);

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <RegionContext.Provider value={{ currency: isHydrated ? currency : "GBP", setCurrency }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
}
