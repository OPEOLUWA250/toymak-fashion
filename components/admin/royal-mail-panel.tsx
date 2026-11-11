"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Package, RefreshCw } from "lucide-react";
import type { Order } from "@/lib/types";
import { CLICK_AND_DROP_URL, isStaleSend, packageFormats, royalMailTrackingUrl, type RoyalMailOrderRecord } from "@/lib/royal-mail";
import { isExpressAvailable } from "@/lib/shipping";

export type SendToRoyalMail = (orderId: string) => Promise<string | undefined>;

const statusChips: Record<RoyalMailOrderRecord["status"], { label: string; className: string }> = {
  sending: { label: "Sending…", className: "bg-neutral-100 text-neutral-600" },
  sent: { label: "Print the label", className: "bg-amber-100 text-amber-800" },
  failed: { label: "Not sent", className: "bg-red-100 text-red-700" },
  skipped: { label: "Create by hand", className: "bg-neutral-100 text-neutral-600" },
};

/** One line for the orders table: where the order stands with Royal Mail. */
export function RoyalMailLine({ order }: { order: Order }) {
  const record = order.royal_mail;
  if (order.tracking_number) return <p className="mt-1 text-xs text-neutral-500">Royal Mail {order.tracking_number}</p>;
  if (!record) return null;
  let label = "Royal Mail: not sent";
  let tone = "font-medium text-amber-700";
  if (record.status === "sent") label = "In Click & Drop: print the label";
  else if (record.status === "skipped") [label, tone] = ["Create in Click & Drop by hand", "text-neutral-500"];
  else if (record.status === "sending" && !isStaleSend(record)) [label, tone] = ["Sending to Royal Mail…", "text-neutral-500"];
  return <p className={`mt-1 text-xs ${tone}`}>{label}</p>;
}

/**
 * The order with Royal Mail: send it to Click & Drop, see what's left to do
 * there, and check for its tracking number once the label's printed.
 */
export function RoyalMailPanel({ order, onSend }: { order: Order; onSend: SendToRoyalMail }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const record = order.royal_mail ?? null;

  if (!record && (order.status !== "unshipped" || order.tracking_number)) return null;

  const stale = record ? isStaleSend(record) : false;
  const abroad = !isExpressAvailable(order.shipping_address?.country ?? "");
  const waitingForLabel = record?.status === "sent" && !order.tracking_number;

  const run = async (confirmText?: string) => {
    if (busy || (confirmText && !window.confirm(confirmText))) return;
    setBusy(true);
    setError(null);
    try {
      setError((await onSend(order.id)) ?? null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not reach Royal Mail. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const chip = order.tracking_number
    ? { label: "Label printed", className: "bg-emerald-100 text-emerald-700" }
    : record ? statusChips[record.status] : null;
  const message = error ?? (order.tracking_number ? null : record?.message ?? null);
  const buttonClass = "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50";
  const secondaryClass = "inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-primary hover:text-primary disabled:opacity-50";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Package size={15} className="text-primary" />
          Royal Mail
        </div>
        {chip && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stale ? "bg-amber-100 text-amber-800" : chip.className}`}>
            {stale ? "Didn't finish" : chip.label}
          </span>
        )}
      </div>

      {(record?.orderIdentifier || order.tracking_number) && (
        <dl className="mb-3 grid gap-x-6 gap-y-1 text-xs text-neutral-600 sm:grid-cols-[auto_1fr]">
          {record?.orderIdentifier && (
            <>
              <dt className="text-neutral-400">Click &amp; Drop order</dt>
              <dd className="font-semibold text-neutral-900">#{record.orderIdentifier} ({order.tracking_id})</dd>
            </>
          )}
          {record?.serviceName && (
            <>
              <dt className="text-neutral-400">Service</dt>
              <dd>{record.serviceName}</dd>
            </>
          )}
          {record?.weightGrams && (
            <>
              <dt className="text-neutral-400">Parcel</dt>
              <dd>
                {record.weightGrams >= 1000 ? `${(record.weightGrams / 1000).toFixed(2)} kg` : `${record.weightGrams} g`}
                {record.packageFormat && ` · ${packageFormats[record.packageFormat].label.split(" (")[0].toLowerCase()}`}
              </dd>
            </>
          )}
          {order.tracking_number && (
            <>
              <dt className="text-neutral-400">Tracking number</dt>
              <dd>
                <a href={royalMailTrackingUrl(order.tracking_number)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  {order.tracking_number}
                  <ExternalLink size={11} />
                </a>
              </dd>
            </>
          )}
        </dl>
      )}

      {waitingForLabel && (
        <p className="mb-3 flex items-start gap-1.5 text-xs text-neutral-500">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
          It&apos;s in Click &amp; Drop. Pay for and print the label there, then drop the parcel at a Post Office. The
          tracking number comes back here, the order turns Shipped and the customer is emailed.
        </p>
      )}

      {!record && (
        <p className="mb-3 text-xs text-neutral-500">
          {abroad
            ? "Orders going abroad need customs details, so create this one in Click & Drop yourself and type its tracking number below."
            : "Not in Click & Drop yet."}
        </p>
      )}

      {message && (
        <p role="alert" className="mb-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!abroad && (!record || record.status === "failed" || record.status === "skipped") && (
          <button type="button" disabled={busy} onClick={() => run()} className={buttonClass}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {record ? "Send to Click & Drop again" : "Send to Click & Drop"}
          </button>
        )}
        {stale && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("Sending this order was cut off part way. Click & Drop is checked for it first, so it won't be there twice. Send it now?")}
            className={secondaryClass}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Send again
          </button>
        )}
        {waitingForLabel && (
          <button type="button" disabled={busy} onClick={() => run()} className={secondaryClass}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Check for tracking number
          </button>
        )}
        {(waitingForLabel || record?.status === "skipped" || abroad) && !order.tracking_number && (
          <a href={CLICK_AND_DROP_URL} target="_blank" rel="noopener noreferrer" className={waitingForLabel ? buttonClass : secondaryClass}>
            Open Click &amp; Drop
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
