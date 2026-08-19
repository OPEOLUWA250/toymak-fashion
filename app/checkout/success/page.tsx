"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/lib/use-orders";
import { Order, OrderItem } from "@/lib/types";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type VerifyState = "loading" | "success" | "failed" | "error";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const { clearCart } = useCart();
  const { orders, addOrder } = useOrders();
  const [state, setState] = useState<VerifyState>("loading");
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!reference) {
      setState("error");
      setErrorMessage("No payment reference was found in the URL.");
      return;
    }

    if (hasStarted.current) return;
    hasStarted.current = true;

    const existing = orders.find((o) => o.payment_reference === reference);
    if (existing) {
      setOrder(existing);
      setState("success");
      return;
    }

    fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Verification failed.");
        return data;
      })
      .then((data) => {
        if (data.status !== "success") {
          setState("failed");
          return;
        }

        const metadata = data.metadata ?? {};
        const shortRef = reference.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

        const newOrder: Order = {
          id: `ord-${shortRef}`,
          tracking_id: `TMK-${shortRef}`,
          customer_name: metadata.customer_name ?? "Guest",
          customer_email: data.customer?.email ?? "",
          customer_phone: metadata.customer_phone ?? "",
          shipping_address: metadata.shipping_address,
          status: "unshipped",
          currency: "NGN",
          payment_gateway: "paystack",
          payment_reference: reference,
          items: (metadata.order_items ?? []) as OrderItem[],
          subtotal: metadata.subtotal ?? 0,
          shipping_cost: metadata.shipping_cost ?? 0,
          tax: metadata.tax ?? 0,
          discount_applied: 0,
          total_amount: metadata.total ?? data.amount / 100,
          created_at: new Date(),
          updated_at: new Date(),
        };

        addOrder(newOrder);
        clearCart();
        setOrder(newOrder);
        setState("success");
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        setState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

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
              Hang tight, we&apos;re checking with Paystack. Don&apos;t close this tab.
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
              <Row label="Amount paid" value={`₦${order.total_amount.toFixed(2)}`} />
              <Row label="Payment reference" value={order.payment_reference} mono />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account"
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
              Paystack reported this transaction as unsuccessful. You haven&apos;t been
              charged, and your cart is exactly as you left it.
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
