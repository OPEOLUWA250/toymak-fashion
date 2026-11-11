"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, Package } from "lucide-react";
import {
  CLICK_AND_DROP_URL,
  defaultServiceLabels,
  packageFormats,
  type RoyalMailPackageFormat,
  type RoyalMailSettings,
} from "@/lib/royal-mail";
import { NumberInput } from "./number-input";

interface ServiceOption {
  code: string;
  name: string;
  price?: number;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary";

/**
 * Settings -> Royal Mail. Works with no changes: paid UK orders go to
 * Click & Drop on Tracked 48 (standard) or Tracked 24 (express). The service,
 * packing size and fallback weight can be changed under "More options".
 */
export function RoyalMailSettingsCard() {
  const [settings, setSettings] = useState<RoyalMailSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [services, setServices] = useState<ServiceOption[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/royal-mail")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.settings) throw new Error(data.error ?? "Could not load the Royal Mail settings.");
        setSettings(data.settings as RoyalMailSettings);
        setConnected(Boolean(data.connected));
        setServices(Array.isArray(data.services) ? data.services : null);
        setServicesError(typeof data.servicesError === "string" ? data.servicesError : null);
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Could not load the Royal Mail settings."));
  }, []);

  if (!settings) {
    return (
      <div className="rounded-none border border-neutral-200 bg-white p-5 text-sm text-neutral-500 lg:p-6">
        {error ?? <Loader2 size={18} className="animate-spin" />}
      </div>
    );
  }

  const change = (next: Partial<RoyalMailSettings>) => {
    setSettings({ ...settings, ...next });
    setSaved(false);
  };

  const pickService = (which: "standard" | "express", code: string) => {
    const name = services?.find((option) => option.code === code)?.name ?? "";
    if (which === "standard") change({ standardService: code, standardServiceName: name });
    else change({ expressService: code, expressServiceName: name });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/royal-mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Could not save the Royal Mail settings.");
      setSettings(data.settings);
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the Royal Mail settings.");
    } finally {
      setSaving(false);
    }
  };

  // Keep a saved choice listed even if the account's list didn't load.
  const optionsFor = (code: string, name: string) => {
    const options = (services ?? []).map((service) => ({
      code: service.code,
      label: `${service.name}${typeof service.price === "number" ? ` · £${service.price.toFixed(2)}` : ""}`,
    }));
    return code && !options.some((option) => option.code === code) ? [{ code, label: name || code }, ...options] : options;
  };
  const serviceLabel = (code: string, name: string, fallback: string) => (code ? name || code : fallback);

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Royal Mail</h2>
            <p className="text-sm text-neutral-500">
              {connected ? "Connected to Click & Drop" : "Not connected: ROYAL_MAIL_API_KEY is missing"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex shrink-0 items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!connected && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          In Click &amp; Drop go to Settings → Integrations → Add a new integration → Click &amp; Drop API, save it, and copy
          the API authorisation key into the website&apos;s ROYAL_MAIL_API_KEY setting (Vercel → Settings → Environment
          Variables), then redeploy.
        </p>
      )}

      <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-neutral-100 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">Send every paid UK order to Click &amp; Drop</p>
          <p className="mt-0.5 text-xs leading-5 text-neutral-500">
            Each order appears in Click &amp; Drop with the service, weight and items filled in. Pay for and print the
            labels there and drop the parcels at a Post Office. The tracking numbers come back to the orders, which turn
            Shipped, and each customer is emailed theirs.
          </p>
          <a href={CLICK_AND_DROP_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Open Click &amp; Drop
            <ExternalLink size={11} />
          </a>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.autoSend}
          aria-label="Send every paid UK order to Click & Drop"
          onClick={() => change({ autoSend: !settings.autoSend })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.autoSend ? "bg-primary" : "bg-neutral-200"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${settings.autoSend ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-100 px-4 py-3">
          <dt className="text-xs text-neutral-500">Standard delivery orders</dt>
          <dd className="mt-0.5 font-medium text-neutral-900">{serviceLabel(settings.standardService, settings.standardServiceName, `${defaultServiceLabels.standard} · drop off`)}</dd>
        </div>
        <div className="rounded-xl border border-neutral-100 px-4 py-3">
          <dt className="text-xs text-neutral-500">Express delivery orders</dt>
          <dd className="mt-0.5 font-medium text-neutral-900">{serviceLabel(settings.expressService, settings.expressServiceName, `${defaultServiceLabels.express} · drop off`)}</dd>
        </div>
      </dl>

      <details className="group mt-6 rounded-xl border border-neutral-100">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-neutral-700">
          <span>
            More options
            <span className="block text-xs font-normal text-neutral-500">
              Service · packed as {packageFormats[settings.packageFormat].label.split(" (")[0].toLowerCase()} · fallback weight {settings.fallbackWeightKg} kg
            </span>
          </span>
          <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" />
        </summary>

        <div className="space-y-6 border-t border-neutral-100 px-4 py-4">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Service</h4>
            <p className="mb-3 text-xs text-neutral-500">
              Automatic uses Royal Mail Tracked 48 for standard orders and Tracked 24 for express, from your Click &amp;
              Drop account. Pick another service only if you always want it.
              {servicesError && <span className="block text-amber-700">Couldn&apos;t load your account&apos;s services: {servicesError}</span>}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block text-xs text-neutral-500">
                Standard delivery orders
                <select value={settings.standardService} onChange={(event) => pickService("standard", event.target.value)} className={inputClass}>
                  <option value="">Automatic: {defaultServiceLabels.standard} (recommended)</option>
                  {optionsFor(settings.standardService, settings.standardServiceName).map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-neutral-500">
                Express delivery orders
                <select value={settings.expressService} onChange={(event) => pickService("express", event.target.value)} className={inputClass}>
                  <option value="">Automatic: {defaultServiceLabels.express} (recommended)</option>
                  {optionsFor(settings.expressService, settings.expressServiceName).map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-neutral-500">
              How orders are packed
              <select
                value={settings.packageFormat}
                onChange={(event) => change({ packageFormat: event.target.value as RoyalMailPackageFormat })}
                className={inputClass}
              >
                {(Object.keys(packageFormats) as RoyalMailPackageFormat[]).map((format) => (
                  <option key={format} value={format}>{packageFormats[format].label}</option>
                ))}
              </select>
              <span className="mt-1 block">Orders too heavy for this size go as the next size up.</span>
            </label>
            <label className="block text-xs text-neutral-500">
              Fallback weight per item
              <div className="mt-1 flex items-center gap-1.5">
                <NumberInput
                  step="0.1"
                  min="0"
                  value={settings.fallbackWeightKg}
                  onValueChange={(value) => change({ fallbackWeightKg: value })}
                  className="w-full max-w-[8rem] rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
                />
                <span className="text-xs text-neutral-500">kg</span>
              </div>
              <span className="mt-1 block">Each product&apos;s own weight is used; this only covers items without one.</span>
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}
