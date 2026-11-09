"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Package } from "lucide-react";
import type { Order } from "@/lib/types";
import { bookingDocumentLabel, isStaleBooking, type Parcel2GoOrderBooking } from "@/lib/parcel2go-booking";
import { isExpressAvailable } from "@/lib/shipping";

export type BookParcel2Go = (orderId: string) => Promise<string | undefined>;

const statusChips: Record<Parcel2GoOrderBooking["status"], { label: string; className: string }> = {
  booking: { label: "Booking…", className: "bg-neutral-100 text-neutral-600" },
  booked: { label: "Booked & paid", className: "bg-emerald-100 text-emerald-700" },
  awaiting_payment: { label: "Needs paying", className: "bg-amber-100 text-amber-800" },
  failed: { label: "Not booked", className: "bg-red-100 text-red-700" },
  skipped: { label: "Book by hand", className: "bg-neutral-100 text-neutral-600" },
};

/** One line for the orders table: where the Parcel2Go booking stands. */
export function Parcel2GoBookingLine({ order }: { order: Order }) {
  const booking = order.parcel2go_booking;
  if (!booking) return null;
  let label = "Parcel2Go: not booked";
  let tone = "font-medium text-amber-700";
  if (booking.status === "booked") [label, tone] = ["Parcel2Go: booked", "text-emerald-700"];
  else if (booking.status === "awaiting_payment") label = "Parcel2Go: needs paying";
  else if (booking.status === "skipped") [label, tone] = ["Parcel2Go: book by hand", "text-neutral-500"];
  else if (booking.status === "booking" && !isStaleBooking(booking)) [label, tone] = ["Parcel2Go: booking…", "text-neutral-500"];
  return <p className={`mt-1 text-xs ${tone}`}>{label}</p>;
}

/**
 * The order's Parcel2Go booking: book it, retry it, pay for it, or print
 * its label. Shown for unshipped orders and any order that has a booking.
 */
export function Parcel2GoBookingPanel({ order, onBook }: { order: Order; onBook: BookParcel2Go }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booking = order.parcel2go_booking ?? null;

  if (!booking && (order.status !== "unshipped" || order.parcel2go_reference)) return null;

  const stale = booking ? isStaleBooking(booking) : false;
  const abroad = !isExpressAvailable(order.shipping_address?.country ?? "");

  const run = async (confirmText: string) => {
    if (busy || !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      setError((await onBook(order.id)) ?? null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not book this order. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const bookText = "Book this parcel on Parcel2Go now? If automatic payment is on in Settings, it's paid from your prepay balance.";
  const chip = booking ? statusChips[booking.status] : null;
  const message = error ?? booking?.message ?? null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Package size={15} className="text-primary" />
          Parcel2Go booking
        </div>
        {chip && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stale ? "bg-amber-100 text-amber-800" : chip.className}`}>
            {stale ? "Didn't finish" : chip.label}
          </span>
        )}
      </div>

      {booking?.orderId && (
        <dl className="mb-3 grid gap-x-6 gap-y-1 text-xs text-neutral-600 sm:grid-cols-[auto_1fr]">
          <dt className="text-neutral-400">Parcel2Go number</dt>
          <dd className="font-semibold text-neutral-900">{order.parcel2go_reference ?? booking.orderLineId ?? booking.orderId}</dd>
          {booking.serviceName && (
            <>
              <dt className="text-neutral-400">Service</dt>
              <dd>{booking.serviceName}</dd>
            </>
          )}
          {typeof booking.price === "number" && (
            <>
              <dt className="text-neutral-400">Cost</dt>
              <dd>£{booking.price.toFixed(2)}</dd>
            </>
          )}
        </dl>
      )}

      {booking?.status === "booked" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(booking.documents ?? []).map((document) => (
              <a
                key={document.url}
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90"
              >
                {bookingDocumentLabel(document.name)}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-neutral-500">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
            {(booking.documents ?? []).length > 0
              ? "Print the label, pack the order and hand it to the courier. It's also in your Parcel2Go account."
              : "The label is in your Parcel2Go account."}{" "}
            The order turns Shipped when the courier scans it.
          </p>
        </div>
      )}

      {!booking && (
        <p className="mb-3 text-xs text-neutral-500">
          {abroad
            ? "Orders going abroad need customs details, so book this one on parcel2go.com and paste its number below."
            : "Not booked yet."}
        </p>
      )}

      {message && booking?.status !== "booked" && (
        <p role="alert" className="mb-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!abroad && (!booking || booking.status === "failed" || booking.status === "skipped") && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(bookText)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {booking ? "Try booking again" : "Book with Parcel2Go"}
          </button>
        )}
        {stale && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("This booking was cut off part way. Check your Parcel2Go account first: if the parcel is already there, don't book again. Book it now?")}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Book again
          </button>
        )}
        {booking?.status === "awaiting_payment" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(`Pay ${typeof booking.price === "number" ? `£${booking.price.toFixed(2)} ` : ""}for this booking from your Parcel2Go prepay balance?`)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Pay from prepay{typeof booking.price === "number" ? ` (£${booking.price.toFixed(2)})` : ""}
            </button>
            {booking.payUrl && (
              <a
                href={booking.payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-primary hover:text-primary"
              >
                Pay on Parcel2Go
                <ExternalLink size={13} />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
