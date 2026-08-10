"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { mockOrders } from "@/lib/mock-orders";
import { mockProducts } from "@/lib/mock-products";
import { useWishlist } from "@/lib/wishlist-context";
import { cn } from "@/lib/utils";
import { Order, OrderStatus } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  Heart,
  MapPin,
  Package,
  Save,
  Search,
  ShieldOff,
  ShoppingBag,
  Trash2,
} from "lucide-react";

const PROFILE_STORAGE_KEY = "toymak-profile";

interface SavedProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

const emptyProfile: SavedProfile = { fullName: "", email: "", phone: "", address: "" };

const orderSteps: { status: OrderStatus; label: string }[] = [
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "out-for-delivery", label: "Out for Delivery" },
  { status: "delivered", label: "Delivered" },
];

export default function AccountPage() {
  const { productIds } = useWishlist();
  const wishlistProducts = mockProducts.filter((product) => productIds.includes(product.id));

  // Order lookup
  const [trackingId, setTrackingId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<Order | null | "not-found">(null);

  const handleTrackOrder = (event: React.FormEvent) => {
    event.preventDefault();
    const match = mockOrders.find(
      (order) =>
        order.tracking_id.trim().toLowerCase() === trackingId.trim().toLowerCase() &&
        order.customer_email.trim().toLowerCase() === lookupEmail.trim().toLowerCase(),
    );
    setLookupResult(match ?? "not-found");
  };

  const currentStepIndex = useMemo(() => {
    if (!lookupResult || lookupResult === "not-found") return -1;
    return orderSteps.findIndex((step) => step.status === lookupResult.status);
  }, [lookupResult]);

  // Saved details (local device only, no account/password)
  const [profile, setProfile] = useState<SavedProfile>(emptyProfile);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {
        // ignore corrupt local data
      }
    }
  }, []);

  const handleSaveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleClearProfile = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(emptyProfile);
  };

  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">My Account</p>
          <h1 className="mt-3 text-4xl font-bold text-neutral">Your Account</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral/60">
            No password, no sign-in. Track an order, manage your wishlist, and save your
            details on this device for a faster checkout next time.
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
                Enter your tracking ID and the email used at checkout.
              </p>
            </div>
          </div>

          <form onSubmit={handleTrackOrder} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral">Tracking ID</label>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="TMK-9281"
                required
                className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
              />
            </div>
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
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
              >
                <Search size={16} />
                Track
              </button>
            </div>
          </form>

          <p className="mt-4 text-xs text-neutral/45">
            This is a demo storefront — try tracking ID{" "}
            <span className="font-medium text-neutral/60">TMK-9281</span> with email{" "}
            <span className="font-medium text-neutral/60">elena@example.com</span> to see it
            in action.
          </p>

          {lookupResult === "not-found" && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral/10 bg-tertiary/30 px-5 py-4 text-sm text-neutral/70">
              <ShieldOff size={18} className="shrink-0 text-neutral/40" />
              We couldn&apos;t find an order matching that tracking ID and email. Double-check
              for typos, or{" "}
              <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
                email us
              </a>{" "}
              for help.
            </div>
          )}

          {lookupResult && lookupResult !== "not-found" && (
            <div className="mt-8 border-t border-neutral/10 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral/45">
                    {lookupResult.tracking_id}
                  </p>
                  <p className="mt-1 text-sm text-neutral/60">
                    Placed{" "}
                    {lookupResult.created_at.toLocaleDateString("en-GB", {
                      dateStyle: "long",
                    })}
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary">
                  £{lookupResult.total_amount.toFixed(2)}
                </span>
              </div>

              {/* Status stepper */}
              <div className="mt-8 flex items-center">
                {orderSteps.map((step, idx) => {
                  const reached = idx <= currentStepIndex;
                  const isLast = idx === orderSteps.length - 1;
                  return (
                    <div key={step.status} className={cn("flex items-center", !isLast && "flex-1")}>
                      <div className="flex flex-col items-center gap-2">
                        {reached ? (
                          <CheckCircle2 size={22} className="text-primary" />
                        ) : (
                          <Circle size={22} className="text-neutral/25" />
                        )}
                        <span
                          className={cn(
                            "text-center text-[11px] font-medium sm:text-xs",
                            reached ? "text-neutral" : "text-neutral/40",
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "mx-2 h-0.5 flex-1 rounded-full",
                            idx < currentStepIndex ? "bg-primary" : "bg-neutral/15",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Items */}
              <div className="mt-8 space-y-4">
                {lookupResult.items.map((item) => (
                  <div
                    key={`${item.product_id}-${item.size}-${item.color}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-tertiary/20 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral">{item.product_name}</p>
                      <p className="text-xs text-neutral/55">
                        Size {item.size} · {item.color} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-neutral">
                      £{item.subtotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wishlist + Saved Details */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Wishlist summary */}
          <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Heart size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-neutral">Wishlist</h2>
                <p className="text-sm text-neutral/60">
                  {wishlistProducts.length > 0
                    ? `${wishlistProducts.length} item${wishlistProducts.length === 1 ? "" : "s"} saved`
                    : "Nothing saved yet"}
                </p>
              </div>
            </div>

            {wishlistProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral/15 px-5 py-8 text-center">
                <p className="text-sm text-neutral/55">
                  Save products you like while browsing and they&apos;ll show up here.
                </p>
                <Link
                  href="/shop"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ShoppingBag size={16} />
                  Browse Products
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  {wishlistProducts.slice(0, 6).map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-tertiary/40"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition group-hover:scale-110"
                      />
                    </Link>
                  ))}
                </div>
                <Link
                  href="/wishlist"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  View full wishlist
                </Link>
              </>
            )}
          </div>

          {/* Saved details */}
          <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-neutral">Saved Details</h2>
                <p className="text-sm text-neutral/60">Saved on this device only</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                />
              </div>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone"
                className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
              />
              <textarea
                value={profile.address}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                placeholder="Shipping address"
                rows={3}
                className="w-full resize-none rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
              />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  <Save size={16} />
                  Save Details
                </button>
                <button
                  type="button"
                  onClick={handleClearProfile}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral/15 px-5 py-3 text-sm font-medium text-neutral/70 transition hover:border-primary hover:text-primary"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
                {justSaved && (
                  <span className="text-sm font-medium text-primary" role="status">
                    Saved on this device
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
