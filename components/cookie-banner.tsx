"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openCookieSettings, setCookieConsent, useCookieBannerOpen } from "@/lib/cookie-consent";

const buttonClass = "rounded-md px-4 py-2.5 text-sm font-semibold transition";

export function CookieBanner() {
  const open = useCookieBannerOpen();
  const pathname = usePathname();

  if (!open || pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  // Sits below the welcome popup (z-50), which covers it until closed, and
  // above the chat bubble's corner on phones so both buttons stay tappable.
  return (
    <section
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-2xl border border-neutral/10 bg-white p-5 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:mx-0"
    >
      <h2 className="text-sm font-semibold text-neutral">Can we use marketing cookies?</h2>
      <p className="mt-2 text-sm leading-6 text-neutral/70">
        They let Meta (Facebook and Instagram) help us measure our ads and show you more relevant
        ones. The shop works the same either way, and you can change your mind at any time. See
        our{" "}
        <Link href="/privacy#cookies" className="font-medium text-primary underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setCookieConsent("denied")}
          className={`${buttonClass} border border-neutral/15 text-neutral hover:border-primary/40`}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setCookieConsent("granted")}
          className={`${buttonClass} bg-primary text-white hover:bg-opacity-90`}
        >
          Accept
        </button>
      </div>
    </section>
  );
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie Settings
    </button>
  );
}
