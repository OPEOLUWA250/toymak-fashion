"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { getPaymentGatewayForCountry } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  MapPin,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";

const paymentOptions = [
  {
    id: "paystack",
    title: "Paystack",
    description: "Best for Nigerian customers",
    icon: WalletCards,
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Best for UK customers",
    icon: CreditCard,
  },
] as const;

const countryPresets = ["United Kingdom", "Nigeria", "United States", "Ghana"];

export default function CheckoutPage() {
  const { items, getTotal } = useCart();
  const [country, setCountry] = useState("United Kingdom");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const selectedGateway = useMemo(
    () => getPaymentGatewayForCountry(country),
    [country],
  );

  useEffect(() => {
    if (selectedGateway === "paystack") {
      return;
    }
  }, [selectedGateway]);

  const subtotal = getTotal();
  const shipping = subtotal > 50 ? 0 : 7.99;
  const tax = country.toLowerCase().includes("nigeria")
    ? subtotal * 0.075
    : subtotal * 0.2;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <main className="bg-white">
        <Header />
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-bold text-neutral">
            Checkout is empty
          </h1>
          <p className="mt-4 text-neutral/60">
            Add products to your cart before continuing to guest checkout.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
          >
            Continue Shopping
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="bg-white">
      <Header />

      <section className="bg-tertiary/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            Guest Checkout
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-neutral">
            Fast, seamless checkout
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral/60">
            No sign-in required. Your country automatically selects the correct
            payment gateway.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <MapPin className="text-primary" size={20} />
                <div>
                  <h2 className="font-serif text-2xl font-bold text-neutral">
                    Shipping details
                  </h2>
                  <p className="text-sm text-neutral/60">
                    Enter your address to unlock the right payment option.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your full name"
                />
                <Field
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  type="email"
                />
                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-neutral/15 px-4 py-3 text-sm outline-none focus:border-primary"
                  >
                    {countryPresets.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Street address"
                  value={street}
                  onChange={setStreet}
                  placeholder="Street address"
                />
                <Field
                  label="City"
                  value={city}
                  onChange={setCity}
                  placeholder="City"
                />
                <Field
                  label="State / Region"
                  value={stateRegion}
                  onChange={setStateRegion}
                  placeholder="State or region"
                />
                <Field
                  label="Postal code"
                  value={postalCode}
                  onChange={setPostalCode}
                  placeholder="Postal code"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="text-primary" size={20} />
                <div>
                  <h2 className="font-serif text-2xl font-bold text-neutral">
                    Payment method
                  </h2>
                  <p className="text-sm text-neutral/60">
                    The selected method changes automatically based on the
                    country above.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const active = option.id === selectedGateway;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`rounded-2xl border p-5 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 shadow-[0_16px_40px_-30px_rgba(230,0,229,0.5)]"
                          : "border-neutral/15 bg-white hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-xl p-3 ${active ? "bg-primary text-white" : "bg-neutral-100 text-neutral"}`}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral">
                                {option.title}
                              </p>
                              <p className="text-xs text-neutral/60">
                                {option.description}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-neutral/60">
                            {active
                              ? "Selected automatically from your shipping country. Payment buttons will be connected next."
                              : "Visible for clarity, but the country-based gateway decides which one is active."}
                          </p>
                        </div>
                        <span
                          className={`mt-1 rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-primary text-white" : "bg-neutral-100 text-neutral/70"}`}
                        >
                          {active ? "Selected" : "Hidden"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-[#fbf6f9] p-4 text-sm text-neutral/70">
                <p className="font-semibold text-neutral">Gateway rule</p>
                <p className="mt-1 leading-6">
                  {selectedGateway === "paystack"
                    ? "Nigeria detected, so Paystack is active."
                    : "UK detected, so Stripe is active."}
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-6 sticky top-28 h-fit">
            <div className="rounded-3xl border border-neutral/10 bg-[#fafafa] p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Truck className="text-primary" size={20} />
                <div>
                  <h2 className="font-serif text-2xl font-bold text-neutral">
                    Order summary
                  </h2>
                  <p className="text-sm text-neutral/60">
                    Review your items before payment.
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-b border-neutral/10 pb-5">
                {items.map((item) => (
                  <div
                    key={`${item.product_id}-${item.size}-${item.color}`}
                    className="flex gap-3"
                  >
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-neutral/60">
                        Size {item.size} · {item.color} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-neutral">
                      £{(item.price_at_addition * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-5 text-sm text-neutral">
                <Row label="Subtotal" value={`£${subtotal.toFixed(2)}`} />
                <Row
                  label="Shipping"
                  value={shipping === 0 ? "FREE" : `£${shipping.toFixed(2)}`}
                  accent={shipping === 0}
                />
                <Row label="VAT / Tax" value={`£${tax.toFixed(2)}`} />
                <Row
                  label="Gateway"
                  value={selectedGateway === "paystack" ? "Paystack" : "Stripe"}
                  accent
                />
              </div>

              <div className="flex items-center justify-between border-t border-neutral/10 pt-5">
                <span className="font-semibold text-neutral">Total</span>
                <span className="font-serif text-2xl font-bold text-primary">
                  £{total.toFixed(2)}
                </span>
              </div>

              <button className="mt-6 w-full rounded-md bg-primary py-3 text-sm font-semibold text-white transition hover:bg-opacity-90">
                Continue to{" "}
                {selectedGateway === "paystack" ? "Paystack" : "Stripe"}
              </button>

              <p className="mt-3 text-center text-xs text-neutral/50">
                Payment buttons will be wired in the next pass. The selected
                gateway is already determined.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral/10 bg-white p-6 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-neutral">
                Why this works
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral/60">
                <li>• UK customers are mapped to Stripe automatically.</li>
                <li>
                  • Nigerian customers are mapped to Paystack automatically.
                </li>
                <li>
                  • The UI still shows both options so the flow is transparent.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral/15 px-4 py-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function Row({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className={accent ? "font-medium text-primary" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
