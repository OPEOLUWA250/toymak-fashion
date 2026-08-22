"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/lib/use-orders";
import { useStockSync } from "@/lib/use-stock-sync";
import { formatCurrency } from "@/lib/pricing";
import { buildOrderFromVerification, PaymentVerification } from "@/lib/order-builder";
import { Order, PaymentGateway } from "@/lib/types";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type VerifyState = "loading" | "success" | "failed" | "error";

const gatewayLabels: Record<PaymentGateway, string> = {
  paystack: "Paystack",
  stripe: "Stripe",
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const gateway: PaymentGateway = searchParams.get("gateway") === "stripe" ? "stripe" : "paystack";
  const paymentId =
    gateway === "stripe" ? searchParams.get("session_id") : searchParams.get("reference");
  const { clearCart } = useCart();
  const { orders, addOrder } = useOrders();
  useStockSync();
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

    const existing = orders.find((o) => o.payment_reference === paymentId);
    if (existing) {
      setOrder(existing);
      setState("success");
      return;
    }

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
      .then((data) => {
        if (data.status !== "success") {
          setState("failed");
          return;
        }

        const newOrder = buildOrderFromVerification(
          paymentId,
          gateway,
          gateway === "stripe" ? "GBP" : "NGN",
          data as PaymentVerification,
        );

        addOrder(newOrder);
        clearCart();
        setOrder(newOrder);
        setState("success");

        // Report to the server so it lands in the durable store and the
        // admin dashboard finds out in real time — fire-and-forget, since
        // the customer's own confirmation above doesn't depend on this.
        // keepalive lets the request survive even if the tab closes right
        // after this line runs, same as a customer would in real usage.
        fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gateway, paymentId }),
          keepalive: true,
        }).catch(() => {
          // webhook (once configured) remains the fallback for this order
        });
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, gateway]);

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
              <Row label="Order ID" value={order.id} />
              <Row label="Tracking ID" value={order.tracking_id} />
              <Row
                label="Amount paid"
                value={formatCurrency(order.total_amount, order.currency)}
              />
              <Row label="Payment reference" value={order.payment_reference} mono />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/account?email=${encodeURIComponent(order.customer_email)}&auto=1`}
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
              {gatewayLabels[gateway]} reported this transaction as unsuccessful. You
              haven&apos;t been charged, and your cart is exactly as you left it.
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

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral/10 py-2.5 last:border-0">
      <span className="text-neutral/60">{label}</span>
      <span className={`font-medium text-neutral ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
