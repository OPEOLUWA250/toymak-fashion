"use client";

import { useEffect, useState } from "react";
import type { StoreSettings } from "./server/settings";

const FALLBACK_SETTINGS: StoreSettings = {
  tax: { GBP: 20, NGN: 7.5, USD: 0 },
  shippingThreshold: { GBP: 50, NGN: 50000, USD: 60 },
  shippingCost: { GBP: 7.99, NGN: 7999, USD: 9.99 },
  exchangeRates: { gbpToNgn: 2000, gbpToUsd: 1.27 },
  welcomeDiscountPercent: 15,
  announcementEnabled: false,
  announcementText: "",
  announcementLink: "/faq",
  orderNotificationEmail: "",
};

// Module-level singleton, same de-dupe pattern as use-reviews.ts — Header
// now calls useSettings() on every single page, so without this every page
// would fire a second (or third, alongside whatever the page itself
// fetches) redundant GET /api/settings.
let settingsCache: StoreSettings | null = null;
let settingsPromise: Promise<StoreSettings> | null = null;

function fetchSettings(): Promise<StoreSettings> {
  if (settingsCache) return Promise.resolve(settingsCache);
  if (!settingsPromise) {
    settingsPromise = fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings?: StoreSettings }) => {
        const settings = data.settings ?? FALLBACK_SETTINGS;
        settingsCache = settings;
        return settings;
      })
      .catch(() => {
        settingsPromise = null;
        return FALLBACK_SETTINGS;
      });
  }
  return settingsPromise;
}

/** Called after a successful admin save so every mounted useSettings() picks up the change. */
export function invalidateSettingsCache() {
  settingsCache = null;
  settingsPromise = null;
}

/**
 * Fetches the live store settings (tax/shipping/exchange rates/announcement
 * banner) from GET /api/settings — the client-side counterpart to
 * lib/server/settings.ts's getStoreSettings(), for "use client" pages that
 * can't call server-only code directly (checkout page, product form,
 * header). Starts with sensible fallbacks so checkout math never breaks
 * mid-load — these get overwritten the moment the real settings arrive.
 */
export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(() => settingsCache ?? FALLBACK_SETTINGS);
  const [isLoading, setIsLoading] = useState(!settingsCache);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, isLoading };
}
