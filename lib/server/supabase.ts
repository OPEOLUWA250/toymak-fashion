import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated as service_role — bypasses
 * Row Level Security entirely. Only ever import this from server-side code
 * (API routes, webhook handlers, server components). Never expose this
 * client, or the key it holds, to the browser.
 *
 * Kept on `globalThis` for the same reason as the event bus: survives
 * Next.js dev's module hot-reloading instead of reconnecting every save.
 */
declare global {
  // eslint-disable-next-line no-var
  var __toymakSupabaseAdmin: SupabaseClient | undefined;
}

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase isn't configured — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  globalThis.__toymakSupabaseAdmin ??= createAdminClient();
  return globalThis.__toymakSupabaseAdmin;
}
