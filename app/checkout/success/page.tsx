"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ReceiptDownloadForm } from "@/components/receipt-download-form";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/pricing";
import { buildOrderFromVerification, PaymentVerification } from "@/lib/order-builder";
import { useCookieConsent } from "@/lib/cookie-consent";
import { trackPurchaseOnce } from "@/lib/meta-pixel";
import { Order, PaymentGateway } from "@/lib/types";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { isExpressAvailable } from "@/lib/shipping";
import { parcel2GoTrackingUrl } from "@/lib/parcel2go-booking";

type VerifyState = "loading" | "success" | "failed" | "error";
type PaymentRef = { gateway: PaymentGateway; paymentId: string | null };

const gatewayLabels: Record<PaymentGateway, string> = {
  paystack: "Paystack",
  stripe: "Stripe",
};

const CONFIRMED_PAYMENT_KEY = "toymak-confirmed-payment";

function readPaymentRef(searchParams: ReturnType<typeof useSearchParams>): PaymentRef {
  const gateway: PaymentGateway = searchParams.get("gateway") === "stripe" ? "stripe" : "paystack";
  const paymentId =
    gateway === "stripe" ? searchParams.get("session_id") : searchParams.get("reference");
  if (paymentId) return { gateway, paymentId };
  try {
    return JSON.parse(sessionStorage.getItem(CONFIRMED_PAYMENT_KEY) ?? "") as PaymentRef;
  } catch {
    return { gateway, paymentId: null };
  }
}

// The payment reference can look up the customer's details, so it comes out of
// the address before the Purchase event reports that address to Meta. Saved for
// this tab so a refresh still confirms the order. If storage is blocked the
// address stays as it was, and the pixel won't send anything from it.
function hidePaymentRef(payment: PaymentRef) {
  try {
    sessionStorage.setItem(CONFIRMED_PAYMENT_KEY, JSON.stringify(payment));
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    // See above.
  }
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  // Kept from first render: hidePaymentRef changes what searchParams returns.
  const [{ gateway, paymentId }] = useState(() => readPaymentRef(searchParams));
  const consent = useCookieConsent();
  const { clearCart } = useCart();
  const [state, setState] = useState<VerifyState>("loading");
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!paymentId) {
      setState("error");
      setErrorMessage("No payment reference was found in the URL.");
      return;
    }

    if (hasStarted.current) return;
    hasStarted.current = true;

    const verifyUrl =
      gateway === "stripe"
        ? `/api/stripe/verify?session_id=${encodeURIComponent(paymentId)}`
        : `/api/paystack/verify?reference=${encodeURIComponent(paymentId)}`;

    fetch(verifyUrl)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Verification failed.");
        return data as { status: "success" | "failed" } & Partial<PaymentVerification>;
      })
      .then(async (data) => {
        if (data.status !== "success") {
          setState("failed");
          return;
        }

        const newOrder = buildOrderFromVerification(paymentId, gateway, data as PaymentVerification);

        const confirmation = await fetch('/api/orders/confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gateway, paymentId }),
        });
        if (!confirmation.ok) throw new Error('Your payment was received, but order confirmation is delayed. Refresh this page or contact support with your payment reference. Do not pay again.');
        clearCart();
        hidePaymentRef({ gateway, paymentId });
        setOrder(newOrder);
        setState('success');
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, gateway]);

  // Follows consent so a customer who only accepts the banner on this page
  // still has their purchase counted.
  useEffect(() => {
    if (order && consent === "granted") trackPurchaseOnce(order);
  }, [order, consent]);

  return (
    <main className="bg-white">
      <Header />
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        {state === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-primary" />
            <h1 className="mt-6 text-2xl font-bold text-neutral">
              Confirming your payment…
            </h1>
            <p className="mt-2 text-sm text-neutral/60">
              Hang tight, we&apos;re checking with {gatewayLabels[gateway]}. Don&apos;t close
              this tab.
            </p>
          </>
        )}

        {state === "success" && order && (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 size={32} />
            </span>
            <h1 className="mt-6 text-3xl font-bold text-neutral">
              Payment confirmed!
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral/60">
              Thanks, {order.customer_name.split(" ")[0]}. Your order is in and we&apos;ll
              start getting it ready to ship.
            </p>

            <div className="mt-8 w-full rounded-2xl border border-neutral/10 bg-[#fafafa] p-6 text-left text-sm">
              <Row label="Order number" value={order.tracking_id} />
              {isExpressAvailable(order.shipping_address.country) && (
                <ParcelTrackingRow email={order.customer_email} orderNumber={order.tracking_id} />
              )}
              <Row
                label="Amount paid"
                value={formatCurrency(order.total_amount, order.currency)}
              />
              <Row label="Payment reference" value={order.payment_reference} mono />
            </div>

            <p className="mt-4 text-xs text-neutral/50">
              Keep your order number ({order.tracking_id}) — with your email, it&apos;s all you
              need to track this order. We&apos;ve also emailed it to you.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/track-order?email=${encodeURIComponent(order.customer_email)}&order=${encodeURIComponent(order.tracking_id)}`}
                className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
              >
                Track my order
              </Link>
              <Link
                href="/shop"
                className="rounded-md border border-neutral/15 px-6 py-3 text-sm font-semibold text-neutral transition hover:border-primary/40"
              >
                Continue shopping
              </Link>
            </div>
            <div className="mt-4">
              <ReceiptDownloadForm
                orderId={order.id}
                email={order.customer_email}
                orderNumber={order.tracking_id}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral/60 underline underline-offset-4 hover:text-primary"
                iconSize={14}
              />
            </div>
          </>
        )}

        {state === "failed" && (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle size={32} />
            </span>
            <h1 className="mt-6 text-3xl font-bold text-neutral">
              Payment wasn&apos;t completed
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral/60">
              {gatewayLabels[gateway]} has not confirmed a completed payment yet.
              If your payment is pending or you see a debit, refresh this page or
              contact us with your payment reference before trying again.
              Your cart has been kept.
            </p>
            <Link
              href="/checkout"
              className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
            >
              Return to checkout
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <XCircle size={32} />
            </span>
            <h1 className="mt-6 text-3xl font-bold text-neutral">
              We couldn&apos;t confirm this payment
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral/60">
              {errorMessage ?? "Something went wrong verifying this transaction."} If
              you were charged, please contact us with your reference so we can check
              manually.
            </p>
            <Link
              href="/checkout"
              className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
            >
              Return to checkout
            </Link>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral/10 py-2.5 last:border-0">
      <span className="text-neutral/60">{label}</span>
      <span className={`font-medium text-neutral ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// UK orders are booked with Parcel2Go a few seconds after payment.
const PARCEL_CHECKS = 12;
const PARCEL_CHECK_EVERY_MS = 5000;

/**
 * The order's Parcel2Go tracking number, which arrives a few seconds after
 * payment when the parcel is booked. Checks for a minute, then gives up
 * quietly (the number is also emailed, and shown on Track Order).
 */
function ParcelTrackingRow({ email, orderNumber }: { email: string; orderNumber: string }) {
  const [reference, setReference] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let checks = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      checks++;
      try {
        const response = await fetch("/api/orders/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, orderNumber }),
        });
        const data = (await response.json()) as { orders?: Order[] };
        const found = data.orders?.[0]?.parcel2go_reference;
        if (found) {
          if (!cancelled) setReference(found);
          return;
        }
      } catch {
        // Try again on the next check.
      }
      if (cancelled) return;
      if (checks < PARCEL_CHECKS) timer = setTimeout(check, PARCEL_CHECK_EVERY_MS);
      else setGaveUp(true);
    };
    timer = setTimeout(check, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, orderNumber]);

  if (gaveUp) return null;
  return (
    <Row
      label="Parcel2Go tracking number"
      value={
        reference ? (
          <a href={parcel2GoTrackingUrl(reference)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
            {reference}
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-neutral/50">
            <Loader2 size={12} className="animate-spin" />
            Booking with the courier…
          </span>
        )
      }
    />
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
