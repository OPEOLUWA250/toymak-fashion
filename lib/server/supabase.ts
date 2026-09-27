import { AsyncLocalStorage } from "node:async_hooks";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated as service_role — bypasses
 * Row Level Security entirely. Only ever import this from server-side code
 * (API routes, webhook handlers, server components). Never expose this
 * client, or the key it holds, to the browser.
 *
 * Kept on `globalThis` for the same reason as the event bus: survives
 * Next.js dev's module hot-reloading instead of reconnecting every save.
 *
 * Inside runAsAdmin(), the client also sends the admin's email in the
 * x-toymak-actor header, which the database's audit trigger records in the
 * activity log (migration 0014).
 */
declare global {
  // eslint-disable-next-line no-var
  var __toymakSupabaseAdmin: SupabaseClient | undefined;
  // eslint-disable-next-line no-var
  var __toymakSupabaseByActor: Map<string, SupabaseClient> | undefined;
  // eslint-disable-next-line no-var
  var __toymakActorStorage: AsyncLocalStorage<string> | undefined;
}

const actorStorage = (globalThis.__toymakActorStorage ??= new AsyncLocalStorage<string>());

function createAdminClient(actor?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase isn't configured — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(actor ? { global: { headers: { "x-toymak-actor": actor } } } : {}),
  });
}

/** Runs `fn` with database writes attributed to this admin in the activity log. */
export function runAsAdmin<T>(email: string, fn: () => T): T {
  return actorStorage.run(email, fn);
}

export function getSupabaseAdmin(): SupabaseClient {
  const actor = actorStorage.getStore();
  if (actor) {
    const clients = (globalThis.__toymakSupabaseByActor ??= new Map());
    let client = clients.get(actor);
    if (!client) {
      client = createAdminClient(actor);
      clients.set(actor, client);
    }
    return client;
  }
  globalThis.__toymakSupabaseAdmin ??= createAdminClient();
  return globalThis.__toymakSupabaseAdmin;
}
