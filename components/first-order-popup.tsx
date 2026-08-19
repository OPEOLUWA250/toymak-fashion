"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { useSignups } from "@/lib/use-signups";

const DISMISSED_KEY = "toymak-popup-dismissed";
const SHOW_DELAY_MS = 4000;

// Placeholder — swap in the real offer once it's decided. Nothing else needs
// to change, this is the only line that drives the headline copy below.
const DISCOUNT_LABEL = "15% Off";

export function FirstOrderPopup() {
  const { addSignup } = useSignups();
  const [visible, setVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const signup = addSignup(firstName, lastName, email);
    setCouponCode(signup.coupon_code);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  const handleCopyCode = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="First order discount offer"
    >
      <div
        className="relative flex w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral shadow-md backdrop-blur transition hover:bg-white hover:text-primary"
        >
          <X size={18} />
        </button>

        {/* Image panel */}
        <div className="relative hidden w-2/5 shrink-0 sm:block">
          <img
            src="/shop-img/imgi_85_img_7941.jpg"
            alt="Toymak shapewear, on model"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Content panel */}
        <div className="flex-1 p-8 sm:p-10">
          {couponCode ? (
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={26} />
              </span>
              <h2 className="text-2xl font-bold text-neutral">You&apos;re in!</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-neutral/60">
                Copy your code below and enter it at checkout to claim {DISCOUNT_LABEL} your
                first order.
              </p>

              <button
                type="button"
                onClick={handleCopyCode}
                className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-4 transition hover:border-primary/70"
              >
                <span className="text-xl font-bold tracking-[0.1em] text-primary">
                  {couponCode}
                </span>
                {copied ? (
                  <Check size={18} className="text-primary" />
                ) : (
                  <Copy size={18} className="text-primary/60" />
                )}
              </button>
              <span className="mt-2 text-xs text-neutral/40">
                {copied ? "Copied!" : "Tap to copy"}
              </span>

              <button
                type="button"
                onClick={dismiss}
                className="mt-8 text-sm font-semibold text-primary hover:underline"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                First Order Offer
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-neutral sm:text-4xl">
                Join Us &amp; Get {DISCOUNT_LABEL} Your First Order!
              </h2>
              <p className="mt-4 text-sm leading-6 text-neutral/60">
                Sign up for early access to new drops, styling tips, and a code for{" "}
                {DISCOUNT_LABEL.toLowerCase()} waiting in your account the moment you join.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    required
                    className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    required
                    className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full rounded-xl border border-neutral/15 bg-transparent px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-primary/90"
                >
                  Claim My Code
                </button>
              </form>

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 w-full text-center text-xs text-neutral/45 underline underline-offset-2 hover:text-neutral/70"
              >
                No thanks, I&apos;ll pay full price
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
