"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Package, Search } from "lucide-react";
import {
  bookingSettingsProblems,
  type Parcel2GoBookingSettings,
  type Parcel2GoParcelSize,
  type Parcel2GoSender,
} from "@/lib/parcel2go-booking";
import { NumberInput } from "./number-input";

interface ServiceOption {
  slug: string;
  name: string;
  price: number;
  collection: string | null;
  delivery: string | null;
  speed: string | null;
  printerRequired: boolean;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary";

const senderFields: { key: keyof Parcel2GoSender; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "name", label: "Contact name" },
  { key: "company", label: "Business name (optional)" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "property", label: "House number or name", placeholder: "12" },
  { key: "street", label: "Street" },
  { key: "town", label: "Town or city" },
  { key: "county", label: "County (optional)" },
  { key: "postcode", label: "Postcode" },
];

const parcelFields: { key: keyof Parcel2GoParcelSize; label: string; unit: string }[] = [
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "lengthCm", label: "Length", unit: "cm" },
  { key: "widthCm", label: "Width", unit: "cm" },
  { key: "heightCm", label: "Height", unit: "cm" },
];

function describeService(service: ServiceOption): string {
  const handover = service.collection === "Collection" ? "collected from you" : service.collection === "Locker" ? "drop at a locker" : "drop at a shop";
  return `£${service.price.toFixed(2)} · ${service.name} · ${handover}${service.printerRequired ? " · printer needed" : ""}`;
}

/** Settings → Parcel2Go booking: sender address, courier service, parcel size, automatic booking. */
export function Parcel2GoSettingsCard() {
  const [settings, setSettings] = useState<Parcel2GoBookingSettings | null>(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceOption[] | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/parcel2go")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.settings) throw new Error(data.error ?? "Could not load the Parcel2Go settings.");
        setSettings(data.settings);
        setConnected(Boolean(data.connected));
        setBalance(typeof data.prepayBalance === "number" ? data.prepayBalance : null);
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : "Could not load the Parcel2Go settings."));
  }, []);

  if (!settings) {
    return (
      <div className="rounded-none border border-neutral-200 bg-white p-5 text-sm text-neutral-500 lg:p-6">
        {error ?? <Loader2 size={18} className="animate-spin" />}
      </div>
    );
  }

  const change = (next: Partial<Parcel2GoBookingSettings>) => {
    setSettings({ ...settings, ...next });
    setSaved(false);
  };
  const changeSender = (key: keyof Parcel2GoSender, value: string) => change({ sender: { ...settings.sender, [key]: value } });
  const changeParcel = (key: keyof Parcel2GoParcelSize, value: number) => {
    change({ parcel: { ...settings.parcel, [key]: value } });
    setServices(null); // Prices depend on the parcel.
  };

  const findServices = async () => {
    setLoadingServices(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/parcel2go/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not get prices from Parcel2Go.");
      setServices(data.services);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not get prices from Parcel2Go.");
    } finally {
      setLoadingServices(false);
    }
  };

  const pickService = (which: "standard" | "express", slug: string) => {
    const service = services?.find((option) => option.slug === slug);
    if (which === "standard") change({ standardService: slug, standardServiceName: service?.name ?? "" });
    else change({ expressService: slug, expressServiceName: service?.name ?? "" });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/parcel2go", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Could not save the Parcel2Go settings.");
      setSettings(data.settings);
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the Parcel2Go settings.");
    } finally {
      setSaving(false);
    }
  };

  const problems = bookingSettingsProblems(settings);
  // Keep the saved choice listed even before the live prices are loaded.
  const optionsFor = (slug: string, name: string) => {
    const options = (services ?? []).map((service) => ({ slug: service.slug, label: describeService(service) }));
    return slug && !options.some((option) => option.slug === slug) ? [{ slug, label: name || slug }, ...options] : options;
  };

  return (
    <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Parcel2Go booking</h2>
            <p className="text-sm text-neutral-500">
              {connected
                ? `Connected${balance !== null ? ` · prepay balance £${balance.toFixed(2)}` : ""}`
                : "Not connected: PARCEL2GO_CLIENT_ID and PARCEL2GO_CLIENT_SECRET are missing"}
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
          {saving ? "Saving…" : saved ? "Saved" : "Save Parcel2Go settings"}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-neutral-100 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">Book new UK orders automatically</p>
          <p className="mt-0.5 text-xs leading-5 text-neutral-500">
            Every new paid order going to a UK address is booked on Parcel2Go straight away, ready to print the label.
            Orders placed before you switch this on are left alone: book those from the order. Orders going abroad
            are always booked by hand.
          </p>
          {settings.autoBook && settings.autoBookSince && (
            <p className="mt-1 text-xs text-emerald-700">
              On since {new Date(settings.autoBookSince).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
          {!settings.autoBook && problems.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">To switch it on: {problems.join(" ")}</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.autoBook}
          aria-label="Book new UK orders automatically"
          onClick={() => change({ autoBook: !settings.autoBook })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.autoBook ? "bg-primary" : "bg-neutral-200"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${settings.autoBook ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <h3 className="text-sm font-semibold text-neutral-900">Sender and collection address</h3>
      <p className="mb-3 text-xs text-neutral-500">Printed on every label as the return address, and where collections happen.</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {senderFields.map((field) => (
          <label key={field.key} className="block text-xs text-neutral-500">
            {field.label}
            <input
              type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
              value={settings.sender[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => changeSender(field.key, event.target.value)}
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-neutral-900">Parcel</h3>
      <p className="mb-3 text-xs text-neutral-500">The packed size and weight used for every booking. Too small and the courier may charge extra.</p>
      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {parcelFields.map((field) => (
          <label key={field.key} className="block text-xs text-neutral-500">
            {field.label}
            <div className="mt-1 flex items-center gap-1.5">
              <NumberInput
                step="0.1"
                min="0"
                value={settings.parcel[field.key]}
                onValueChange={(value) => changeParcel(field.key, value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
              />
              <span className="text-xs text-neutral-500">{field.unit}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Courier service</h3>
          <p className="text-xs text-neutral-500">Live Parcel2Go prices for the parcel above, from your postcode.</p>
        </div>
        <button
          type="button"
          onClick={findServices}
          disabled={loadingServices || !connected}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {loadingServices ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {services ? "Refresh prices" : "Show services and prices"}
        </button>
      </div>
      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <label className="block text-xs text-neutral-500">
          Standard delivery orders
          <select
            value={settings.standardService}
            onChange={(event) => pickService("standard", event.target.value)}
            className={inputClass}
          >
            <option value="">{services ? "Choose a service" : "Click “Show services and prices”"}</option>
            {optionsFor(settings.standardService, settings.standardServiceName).map((option) => (
              <option key={option.slug} value={option.slug}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-neutral-500">
          Express delivery orders
          <select
            value={settings.expressService}
            onChange={(event) => pickService("express", event.target.value)}
            className={inputClass}
          >
            <option value="">Same as standard</option>
            {optionsFor(settings.expressService, settings.expressServiceName).map((option) => (
              <option key={option.slug} value={option.slug}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-neutral-900">Payment</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-neutral-100 px-4 py-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={settings.payWithPrepay}
            onChange={(event) => change({ payWithPrepay: event.target.checked })}
            className="mt-1"
          />
          <span>
            Pay from the Parcel2Go prepay balance
            <span className="block text-xs text-neutral-500">
              Off: bookings wait in the admin until someone pays for them.
            </span>
          </span>
        </label>
        <label className="block rounded-xl border border-neutral-100 px-4 py-3 text-sm text-neutral-700">
          Pay automatically up to
          <span className="block text-xs text-neutral-500">Dearer bookings wait for someone to pay them.</span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-sm text-neutral-500">£</span>
            <NumberInput
              step="0.01"
              min="0"
              value={settings.maxPriceGBP}
              onValueChange={(value) => change({ maxPriceGBP: value })}
              className="w-full max-w-[8rem] rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary"
            />
          </div>
        </label>
      </div>
    </div>
  );
}
