"use client";

import { StoreImage } from "@/components/store-image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { ReceiptDownloadForm } from "@/components/receipt-download-form";
import { formatCurrency } from "@/lib/pricing";
import { normalizeExternalUrl } from "@/lib/utils";
import { useProducts } from "@/lib/use-products";
import { Order, OrderStatus } from "@/lib/types";
import {
  ExternalLink,
  Loader2,
  Package,
  Search,
  ShieldOff,
  Truck,
  type LucideIcon,
} from "lucide-react";

const statusLabels: Record<OrderStatus, string> = {
  unshipped: "Preparing your order",
  shipped: "Shipped",
};

// Only "Preparing" and "Shipped" happen on our side — once an order ships,
// the courier's own tracking link (order.tracking_link) is the source of
// truth for out-for-delivery/delivered, so the stepper ends with a muted
// "With Courier" handoff node instead of stages we can't actually track.
const orderStages: { status: OrderStatus; label: string; icon: LucideIcon }[] = [
  { status: "unshipped", label: "Preparing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
];

function OrderProgress({ status }: { status: OrderStatus }) {
  const currentIndex = orderStages.findIndex((stage) => stage.status === status);
  const handedToCourier = currentIndex === orderStages.length - 1;

  return (
    <div className="flex items-start">
      {orderStages.map((stage, index) => {
        const Icon = stage.icon;
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isActive = isComplete || isCurrent;
        const isLastRealStage = index === orderStages.length - 1;
        const connectorFilled = isLastRealStage ? isActive : isComplete;

        return (
          <div key={stage.status} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                  isActive
                    ? "border-primary bg-primary text-white"
                    : "border-neutral/15 bg-white text-neutral/25"
                }`}
              >
                <Icon size={15} strokeWidth={isCurrent ? 2.5 : 2} />
              </span>
              <span
                className={`mx-1 h-px flex-1 transition ${
                  connectorFilled ? "bg-primary" : "bg-neutral/10"
                }`}
              />
            </div>
            <span
              className={`mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] ${
                isActive ? "text-neutral" : "text-neutral/35"
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}

      {/* Handoff marker — we stop tracking here; the courier's link picks up the rest */}
      <div className="flex flex-col items-center">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed transition ${
            handedToCourier ? "border-primary/50 text-primary/60" : "border-neutral/15 text-neutral/25"
          }`}
        >
          <ExternalLink size={14} />
        </span>
        <span
          className={`mt-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] ${
            handedToCourier ? "text-neutral/60" : "text-neutral/35"
          }`}
        >
          With Courier
        </span>
      </div>
    </div>
  );
}

function TrackOrderContent() {
  const { products } = useProducts();
  const searchParams = useSearchParams();
  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  // Guest lookup — checkout email plus the order number from the
  // confirmation email / success page. No account or sign-in involved.
  const [lookupEmail, setLookupEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [matchedOrders, setMatchedOrders] = useState<Order[] | null>(null);
  // The credentials that produced matchedOrders — receipt downloads and
  // return requests re-prove ownership with these, not the live inputs.
  const [verified, setVerified] = useState<{ email: string; orderNumber: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);

  const runLookup = async (email: string, number: string) => {
    setIsLooking(true);
    setLookupError(null);
    setMatchedOrders(null);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orderNumber: number }),
      });
      const data = (await response.json()) as { orders?: Order[]; error?: string };
      if (response.status === 404) {
        setMatchedOrders([]);
        return;
      }
      if (!response.ok || !Array.isArray(data.orders)) {
        throw new Error(data.error || "Could not look up your order. Please retry.");
      }
      setMatchedOrders(
        data.orders.map((order) => ({
          ...order,
          created_at: new Date(order.created_at),
          updated_at: new Date(order.updated_at),
        })),
      );
      setVerified({ email, orderNumber: number });
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Could not look up your order. Please retry.");
    } finally {
      setIsLooking(false);
    }
  };

  const handleTrackOrder = (event: React.FormEvent) => {
    event.preventDefault();
    void runLookup(lookupEmail, orderNumber);
  };

  // Arriving from checkout/success or the confirmation email with
  // ?email=...&order=... — prefill and look the order up straight away.
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const orderParam = searchParams.get("order");
    if (emailParam) setLookupEmail(emailParam);
    if (orderParam) setOrderNumber(orderParam);
    if (emailParam && orderParam) void runLookup(emailParam, orderParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Order Tracking</p>
          <h1 className="mt-3 text-4xl font-bold text-neutral">Track Your Order</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral/60">
            No account needed — use the email you checked out with and the order number from
            your confirmation email.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Track Order */}
        <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package size={20} />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-neutral">Track an Order</h2>
              <p className="text-sm text-neutral/60">
                Your checkout email and order number (e.g. TMK-AB12CD).
              </p>
            </div>
          </div>

          <form onSubmit={handleTrackOrder} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral">Email</label>
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral">
                Order number
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="TMK-AB12CD"
                required
                maxLength={40}
                className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLooking}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
              >
                {isLooking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Track
              </button>
            </div>
          </form>

          <p className="mt-4 text-xs text-neutral/45">
            Your order number is in your confirmation email and was shown after payment.
          </p>

          {lookupError && (
            <p role="alert" className="mt-6 text-sm text-red-700">{lookupError}</p>
          )}

          {matchedOrders && matchedOrders.length === 0 && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral/10 bg-tertiary/30 px-5 py-4 text-sm text-neutral/70">
              <ShieldOff size={18} className="shrink-0 text-neutral/40" />
              We couldn&apos;t find an order matching that email and order number. Double-check for typos, or{" "}
              <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
                email us
              </a>{" "}
              for help.
            </div>
          )}

          {matchedOrders && matchedOrders.length > 0 && (
            <div className="mt-8 space-y-8 border-t border-neutral/10 pt-8">
              {matchedOrders.map((order) => (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-none border border-neutral/10 bg-white"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral/10 bg-tertiary/15 px-6 py-5 sm:px-8">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                        Order {order.tracking_id}
                      </p>
                      <p className="mt-1.5 text-sm text-neutral/50">
                        Placed{" "}
                        {order.created_at.toLocaleDateString("en-GB", { dateStyle: "long" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral/35">
                        Total
                      </p>
                      <p className="mt-1.5 text-2xl font-bold text-primary">
                        {formatCurrency(order.total_amount, order.currency)}
                      </p>
                      {verified && (
                        <ReceiptDownloadForm
                          orderId={order.id}
                          email={verified.email}
                          orderNumber={verified.orderNumber}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral/60 hover:text-primary"
                          iconSize={12}
                        />
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="px-6 py-7 sm:px-10">
                    <p className="mb-6 text-sm font-semibold text-neutral">
                      {statusLabels[order.status]}
                    </p>
                    <OrderProgress status={order.status} />

                    {order.status === "unshipped" ? (
                      <p className="mt-7 rounded-xl bg-tertiary/25 px-4 py-3 text-sm text-neutral/60">
                        Your order is being prepared. A tracking link will appear here as soon
                        as it ships.
                      </p>
                    ) : order.tracking_link ? (
                      <div className="mt-7 space-y-2">
                        <a
                          href={normalizeExternalUrl(order.tracking_link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                        >
                          <Truck size={16} />
                          Track Package
                          <ExternalLink size={14} />
                        </a>
                        <p className="text-xs text-neutral/45">
                          Your order has shipped — follow it out for delivery with our courier
                          partner above.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Items */}
                  <div className="space-y-4 border-t border-neutral/10 px-6 py-6 sm:px-8">
                    {order.items.map((item) => {
                      const product = productLookup.get(item.product_id);
                      return (
                        <div
                          key={`${item.product_id}-${item.size}-${item.color}`}
                          className="flex items-center gap-4"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-tertiary/40">
                            {product?.images?.[0] && (
                              <StoreImage sizes="64px"
                                src={product.images[0]}
                                alt={item.product_name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral">
                              {item.product_name}
                            </p>
                            <p className="mt-0.5 text-xs text-neutral/50">
                              Size {item.size} · {item.color} · Qty {item.quantity}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-neutral">
                            {formatCurrency(item.subtotal, order.currency)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="border-t border-neutral/10 px-6 py-4 text-sm text-neutral/60 sm:px-8">
                    Need to return or exchange something? See our{" "}
                    <Link href="/returns" className="font-semibold text-primary hover:underline">
                      returns policy
                    </Link>
                    .
                  </p>
                  {/* Totals */}
                  <div className="space-y-2 border-t border-neutral/10 bg-tertiary/15 px-6 py-5 text-sm sm:px-8">
                    <div className="flex items-center justify-between text-neutral/60">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal, order.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral/60">
                      <span>Shipping</span>
                      <span>
                        {order.shipping_cost === 0
                          ? "Free"
                          : formatCurrency(order.shipping_cost, order.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral/60">
                      <span>Tax</span>
                      <span>{formatCurrency(order.tax, order.currency)}</span>
                    </div>
                    {(order.refunded_amount ?? 0) > 0 && <p>Refunded: {formatCurrency(order.refunded_amount!, order.currency)}</p>}
                    {order.discount_applied > 0 && (
                      <div className="flex items-center justify-between text-primary">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount_applied, order.currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-neutral/10 pt-3 text-base font-bold text-neutral">
                      <span>Total paid</span>
                      <span>{formatCurrency(order.total_amount, order.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderContent />
    </Suspense>
  );
}
