"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Globe, Loader2, RefreshCw, Ticket, Truck, WalletCards } from "lucide-react";
import type { StoreSettings } from "@/lib/server/settings";
import type { Currency } from "@/lib/types";

const currencyRows: { currency: Currency; taxLabel: string; symbol: string }[] = [
  { currency: "GBP", taxLabel: "United Kingdom (VAT)", symbol: "£" },
  { currency: "NGN", taxLabel: "Nigeria (VAT)", symbol: "₦" },
  { currency: "USD", taxLabel: "United States (Sales tax)", symbol: "$" },
];

export function SettingsView() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings?: StoreSettings }) => {
        if (data.settings) setSettings(data.settings);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateField = <Section extends "tax" | "shippingThreshold" | "shippingCost">(
    section: Section,
    currency: Currency,
    value: number,
  ) => {
    setSettings((current) =>
      current ? { ...current, [section]: { ...current[section], [currency]: value } } : current,
    );
    setSaved(false);
  };

  const updateRate = (key: keyof StoreSettings["exchangeRates"], value: number) => {
    setSettings((current) =>
      current ? { ...current, exchangeRates: { ...current.exchangeRates, [key]: value } } : current,
    );
    setSaved(false);
  };

  const updateWelcomeDiscount = (value: number) => {
    setSettings((current) => (current ? { ...current, welcomeDiscountPercent: value } : current));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { settings?: StoreSettings };
      if (data.settings) {
        setSettings(data.settings);
        setSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm leading-6 text-neutral-600">
          These numbers drive real checkout math — the tax and shipping a customer is actually
          charged come straight from what's saved here.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex shrink-0 items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : null}
          {isSaving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Payment Gateway Routing</h2>
            <p className="text-sm text-neutral-500">
              Chosen automatically by shipping country — read-only, set in code
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <WalletCards size={15} />
              Nigeria
            </span>
            <span className="bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              Paystack · NGN
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <Globe size={15} />
              Everywhere else (default)
            </span>
            <span className="bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Stripe · GBP
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Tax</h2>
            <p className="text-sm text-neutral-500">Applied to order subtotal at checkout, per currency</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {currencyRows.map((row) => (
            <div key={row.currency} className="rounded-xl border border-neutral-100 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-neutral-700">{row.taxLabel}</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.tax[row.currency]}
                  onChange={(e) => updateField("tax", row.currency, Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
                />
                <span className="text-sm text-neutral-500">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Ticket size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Coupons</h2>
            <p className="text-sm text-neutral-500">
              Rate applied by every WELCOME-XXXXXX code from the homepage popup — changing this
              changes what every unredeemed code is worth from now on
            </p>
          </div>
        </div>
        <label className="block max-w-xs rounded-xl border border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
          Welcome discount
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.welcomeDiscountPercent}
              onChange={(e) => updateWelcomeDiscount(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
            />
            <span className="text-sm text-neutral-500">%</span>
          </div>
        </label>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Shipping</h2>
            <p className="text-sm text-neutral-500">Free above the threshold, flat cost below it</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {currencyRows.map((row) => (
            <div key={row.currency} className="space-y-2 rounded-xl border border-neutral-100 px-4 py-3">
              <p className="text-sm font-medium text-neutral-700">{row.currency}</p>
              <label className="block text-xs text-neutral-500">
                Free-shipping threshold
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm text-neutral-500">{row.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.shippingThreshold[row.currency]}
                    onChange={(e) =>
                      updateField("shippingThreshold", row.currency, Number(e.target.value) || 0)
                    }
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
                  />
                </div>
              </label>
              <label className="block text-xs text-neutral-500">
                Cost below threshold
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm text-neutral-500">{row.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.shippingCost[row.currency]}
                    onChange={(e) => updateField("shippingCost", row.currency, Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
                  />
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <RefreshCw size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Exchange rates</h2>
            <p className="text-sm text-neutral-500">
              Used only to suggest NGN/USD prices from a GBP entry on the product form — never
              applied automatically, always editable there before saving
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block rounded-xl border border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
            1 GBP =
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.exchangeRates.gbpToNgn}
                onChange={(e) => updateRate("gbpToNgn", Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
              />
              <span className="text-sm text-neutral-500">NGN</span>
            </div>
          </label>
          <label className="block rounded-xl border border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-700">
            1 GBP =
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={settings.exchangeRates.gbpToUsd}
                onChange={(e) => updateRate("gbpToUsd", Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
              />
              <span className="text-sm text-neutral-500">USD</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
