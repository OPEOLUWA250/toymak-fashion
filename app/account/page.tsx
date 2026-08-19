"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useOrders } from "@/lib/use-orders";
import { mockProducts } from "@/lib/mock-products";
import { useWishlist } from "@/lib/wishlist-context";
import { Order, OrderStatus } from "@/lib/types";
import {
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Package,
  Save,
  Search,
  ShieldOff,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

const PROFILE_STORAGE_KEY = "toymak-profile";

interface SavedProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

const emptyProfile: SavedProfile = { fullName: "", email: "", phone: "", address: "" };

const statusLabels: Record<OrderStatus, string> = {
  unshipped: "Preparing your order",
  shipped: "Shipped",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
};

const statusStyles: Record<OrderStatus, string> = {
  unshipped: "bg-neutral/10 text-neutral/60",
  shipped: "bg-primary/10 text-primary",
  "out-for-delivery": "bg-blue-50 text-blue-700",
  delivered: "bg-emerald-50 text-emerald-700",
};

export default function AccountPage() {
  const { orders } = useOrders();
  const { productIds } = useWishlist();
  const wishlistProducts = mockProducts.filter((product) => productIds.includes(product.id));

  // Order lookup — email alone is enough; tracking ID just narrows results
  // for anyone who happens to still have it, since most customers won't.
  const [lookupEmail, setLookupEmail] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [matchedOrders, setMatchedOrders] = useState<Order[] | null>(null);

  const handleTrackOrder = (event: React.FormEvent) => {
    event.preventDefault();
    const email = lookupEmail.trim().toLowerCase();
    const tracking = trackingId.trim().toLowerCase();

    const matches = orders
      .filter((order) => order.customer_email.trim().toLowerCase() === email)
      .filter((order) => !tracking || order.tracking_id.trim().toLowerCase() === tracking)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    setMatchedOrders(matches);
  };

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
                Just the email you used at checkout — no tracking ID needed.
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
                Tracking ID <span className="font-normal text-neutral/40">(optional)</span>
              </label>
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Have it? Narrows results"
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
            This is a demo storefront — try email{" "}
            <span className="font-medium text-neutral/60">elena@example.com</span> to see it
            in action.
          </p>

          {matchedOrders && matchedOrders.length === 0 && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-neutral/10 bg-tertiary/30 px-5 py-4 text-sm text-neutral/70">
              <ShieldOff size={18} className="shrink-0 text-neutral/40" />
              We couldn&apos;t find any orders for that email. Double-check for typos, or{" "}
              <a href="mailto:hello@toymak.com" className="text-primary hover:underline">
                email us
              </a>{" "}
              for help.
            </div>
          )}

          {matchedOrders && matchedOrders.length > 0 && (
            <div className="mt-8 space-y-6 border-t border-neutral/10 pt-8">
              {matchedOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-neutral/10 bg-tertiary/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral/45">
                        {order.tracking_id}
                      </p>
                      <p className="mt-1 text-sm text-neutral/60">
                        Placed{" "}
                        {order.created_at.toLocaleDateString("en-GB", { dateStyle: "long" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xl font-bold text-primary">
                        £{order.total_amount.toFixed(2)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[order.status]}`}
                      >
                        {order.status === "unshipped" ? (
                          <Clock size={12} />
                        ) : (
                          <Truck size={12} />
                        )}
                        {statusLabels[order.status]}
                      </span>
                    </div>
                  </div>

                  {order.status === "unshipped" ? (
                    <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-neutral/60">
                      Your order is being prepared. A tracking link will appear here as soon as
                      it ships.
                    </p>
                  ) : order.tracking_link ? (
                    <a
                      href={order.tracking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                    >
                      <Truck size={16} />
                      Track Package
                      <ExternalLink size={14} />
                    </a>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={`${item.product_id}-${item.size}-${item.color}`}
                        className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3"
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
              ))}
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
