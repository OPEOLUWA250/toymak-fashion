"use client";

import { useEffect, useMemo, useState } from "react";
import { NewsletterSignup } from "./types";

const STORAGE_KEY = "toymak-signups";

function reviveDates(signups: NewsletterSignup[]): NewsletterSignup[] {
  return signups.map((signup) => ({ ...signup, created_at: new Date(signup.created_at) }));
}

function generateCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1, easy to type from an email
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WELCOME-${suffix}`;
}

/**
 * Shared with both the homepage popup (which writes a new signup) and the
 * admin dashboard (which reads them) — same localStorage-backed pattern as
 * useOrders/useAdminProducts until there's a real backend to send the code
 * by email instead of just displaying it in the popup.
 */
export function useSignups() {
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSignups(reviveDates(JSON.parse(saved)));
      } catch {
        // ignore corrupt local data
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(signups));
    }
  }, [signups, isHydrated]);

  const actions = useMemo(
    () => ({
      addSignup: (firstName: string, lastName: string, email: string) => {
        const signup: NewsletterSignup = {
          id: `signup-${Date.now()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          coupon_code: generateCouponCode(),
          created_at: new Date(),
        };
        setSignups((current) => [signup, ...current]);
        return signup;
      },
    }),
    [],
  );

  return { signups, ...actions };
}
