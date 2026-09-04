"use client";

import { useEffect, useState } from "react";
import type { StoreSettings } from "./server/settings";

const FALLBACK_SETTINGS: StoreSettings = {
  tax: { GBP: 20, NGN: 7.5, USD: 0 },
  shippingThreshold: { GBP: 50, NGN: 50000, USD: 60 },
  shippingCost: { GBP: 7.99, NGN: 7999, USD: 9.99 },
  exchangeRates: { gbpToNgn: 2000, gbpToUsd: 1.27 },
  welcomeDiscountPercent: 15,
};

/**
 * Fetches the live store settings (tax/shipping/exchange rates) from
 * GET /api/settings — the client-side counterpart to
 * lib/server/settings.ts's getStoreSettings(), for "use client" pages that
 * can't call server-only code directly (checkout page, product form).
 * Starts with sensible fallbacks so checkout math never breaks mid-load —
 * these get overwritten the moment the real settings arrive.
 */
export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(FALLBACK_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings?: StoreSettings }) => {
        if (data.settings) setSettings(data.settings);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading };
}
