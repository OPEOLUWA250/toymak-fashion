"use client";

import { useEffect, useState } from "react";
import { NewsletterSignup } from "./types";

function reviveDates(signups: NewsletterSignup[]): NewsletterSignup[] {
  return signups.map((signup) => ({ ...signup, created_at: new Date(signup.created_at) }));
}

/**
 * Admin-facing read of the signups list — backed by GET /api/signups
 * (Supabase). Creating a signup now happens directly from the popup via
 * POST /api/signups, which also owns the real, global duplicate check
 * (server-side, not per-browser localStorage like the old version).
 */
export function useSignups() {
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signups")
      .then((response) => response.json())
      .then((data: { signups?: NewsletterSignup[] }) => {
        setSignups(reviveDates(data.signups ?? []));
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { signups, isLoading };
}
