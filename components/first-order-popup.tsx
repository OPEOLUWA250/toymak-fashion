"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useSignups } from "@/lib/use-signups";
import { NewsletterSignup } from "@/lib/types";

const DISMISSED_KEY = "toymak-popup-dismissed";
const SHOW_DELAY_MS = 4000;

// Placeholder — swap in the real number once it's decided. The badge,
// headline, and body copy all derive from this single value.
const DISCOUNT_PERCENT = "15";
const DISCOUNT_LABEL = `${DISCOUNT_PERCENT}% off`;

type EmailStatus = "idle" | "sending" | "sent" | "failed" | "duplicate";

export function FirstOrderPopup() {
  const { addSignup, markEmailSent } = useSignups();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [signup, setSignup] = useState<NewsletterSignup | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => setEntered(true));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    setEntered(false);
    localStorage.setItem(DISMISSED_KEY, "true");
    setTimeout(() => setVisible(false), 200);
  };

  // The code only ever appears in the email — never on screen — so sending
  // has to be able to fail without stranding the customer. This is used
  // both for the initial send and the "Try again" / "Resend" retry.
  const sendCouponEmail = async (target: NewsletterSignup) => {
    setEmailStatus("sending");
    try {
      const response = await fetch("/api/signups/send-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: target.first_name,
          email: target.email,
          couponCode: target.coupon_code,
          discountLabel: DISCOUNT_LABEL,
        }),
      });
      if (!response.ok) throw new Error("Email send failed");
      markEmailSent(target.id);
      setEmailStatus("sent");
    } catch {
      setEmailStatus("failed");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const { signup: newSignup, isNew } = addSignup(firstName, lastName, email);
    setSignup(newSignup);
    localStorage.setItem(DISMISSED_KEY, "true");

    if (!isNew) {
      // Same email submitting again — don't mint a new code or fire off
      // another email automatically; let them explicitly ask for a resend.
      setEmailStatus("duplicate");
      return;
    }

    await sendCouponEmail(newSignup);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-neutral/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="First order discount offer"
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
          entered ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-3 opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[560px] flex-col justify-end sm:min-h-[600px]">
          <img
            src="/shop-img/imgi_85_img_7941.jpg"
            alt="Toymak shapewear, on model"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Same bottom-anchored scrim used on the New Arrivals feature tile
              and Find Your Fit section, just extended for a taller content zone. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral shadow-md backdrop-blur transition hover:bg-white hover:text-primary"
          >
            <X size={18} />
          </button>

          {!signup && (
            <span className="absolute left-5 top-5 z-10 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {DISCOUNT_PERCENT}% Off
            </span>
          )}

          <div className="relative z-10 p-6 sm:p-8">
            {signup ? (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                  <Sparkles size={22} />
                </span>
                <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                  {emailStatus === "duplicate" ? "Welcome back!" : "You're in!"}
                </h2>
                <p className="mx-auto mt-2 max-w-[24rem] text-sm leading-6 text-white/80">
                  {emailStatus === "sent" && (
                    <>
                      We&apos;ve emailed your {DISCOUNT_LABEL} code to{" "}
                      <span className="font-semibold text-white">{signup.email}</span>. Check
                      your inbox (and spam folder) — it&apos;s on its way.
                    </>
                  )}
                  {emailStatus === "sending" && <>Sending your code to {signup.email}…</>}
                  {emailStatus === "duplicate" && (
                    <>
                      This email already claimed a code — we&apos;ve sent it before, so check
                      your inbox (and spam folder). Didn&apos;t get it?
                    </>
                  )}
                  {emailStatus === "failed" && (
                    <>
                      We couldn&apos;t send your code just now. Try again below, or reach us
                      at{" "}
                      <a href="mailto:hello@toymak.com" className="text-white underline">
                        hello@toymak.com
                      </a>
                      .
                    </>
                  )}
                </p>

                {emailStatus === "sent" ? (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="mx-auto mt-7 inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral transition hover:bg-white/90"
                  >
                    Continue Shopping
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => sendCouponEmail(signup)}
                      disabled={emailStatus === "sending"}
                      className="mx-auto mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-neutral transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {emailStatus === "sending" && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      {emailStatus === "sending"
                        ? "Sending…"
                        : emailStatus === "failed"
                          ? "Try again"
                          : "Resend email"}
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="mt-4 block w-full text-center text-xs text-white/60 underline underline-offset-2 hover:text-white/85"
                    >
                      Continue Shopping
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  Just for you
                </p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {DISCOUNT_LABEL} your first order
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
                  Sign up for early access to new drops, styling tips, and a code
                  waiting for you the moment you join.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      required
                      className="w-full rounded-xl border border-white/50 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 transition focus:border-primary"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      required
                      className="w-full rounded-xl border border-white/50 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 transition focus:border-primary"
                    />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full rounded-xl border border-white/50 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 transition focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
                  >
                    Claim My Code
                  </button>
                </form>

                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-4 w-full text-center text-xs text-white/60 underline underline-offset-2 hover:text-white/85"
                >
                  No thanks, I&apos;ll pay full price
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
