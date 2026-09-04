"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client, authenticated as anon — only used for the
 * admin login form (supabase.auth.signInWithPassword). Everything else in
 * this app reads/writes through our own API routes with the service_role
 * key, never directly from the browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
