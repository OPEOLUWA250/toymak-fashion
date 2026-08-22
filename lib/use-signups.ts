"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 * useOrders/useAdminProducts. The coupon code is emailed via
 * /api/signups/send-coupon; markEmailSent records whether that actually
 * went out so admin can see delivery status, not just that someone signed up.
 */
export function useSignups() {
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  // Kept current every render (not via an effect) so addSignup's duplicate
  // check below always sees the latest list, even though it's called from
  // a useMemo-stable function that doesn't otherwise re-close over state.
  const signupsRef = useRef(signups);
  signupsRef.current = signups;

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
      // Returns isNew so callers (the popup) know whether to actually send
      // an email — resubmitting the same email should surface the code
      // that's already theirs, not mint a second one and re-email it.
      addSignup: (
        firstName: string,
        lastName: string,
        email: string,
      ): { signup: NewsletterSignup; isNew: boolean } => {
        const normalizedEmail = email.trim().toLowerCase();
        const existing = signupsRef.current.find((s) => s.email === normalizedEmail);
        if (existing) {
          return { signup: existing, isNew: false };
        }

        const signup: NewsletterSignup = {
          id: `signup-${Date.now()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: normalizedEmail,
          coupon_code: generateCouponCode(),
          email_sent: false,
          created_at: new Date(),
        };
        setSignups((current) => [signup, ...current]);
        return { signup, isNew: true };
      },
      markEmailSent: (signupId: string) => {
        setSignups((current) =>
          current.map((signup) =>
            signup.id === signupId ? { ...signup, email_sent: true } : signup,
          ),
        );
      },
    }),
    [],
  );

  return { signups, ...actions };
}
