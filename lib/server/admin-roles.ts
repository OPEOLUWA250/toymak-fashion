import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase";
import { isSuperAdminEmail } from "./admin-emails";

/**
 * Who may use the dashboard. Shared by proxy.ts and admin-auth.ts, so it
 * must not depend on Next.js request APIs.
 *
 * - super_admin: listed in ADMIN_EMAILS (an "owner"), or an admin_users
 *   row with role super_admin
 * - admin: an admin_users row with role admin
 */
export type AdminRole = "super_admin" | "admin";

export async function resolveAdminRole(user: User | null | undefined): Promise<AdminRole | null> {
  if (!user?.email || !user.email_confirmed_at) return null;
  if (isSuperAdminEmail(user.email)) return "super_admin";
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .eq("email", user.email.trim().toLowerCase())
      .maybeSingle();
    if (error || !data) return null;
    return data.role === "super_admin" ? "super_admin" : "admin";
  } catch {
    return null;
  }
}

/** Pre-sign-in check by email (login and forgot-password forms). */
export async function isAllowedAdminEmail(email: string): Promise<boolean> {
  if (isSuperAdminEmail(email)) return true;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("admin_users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

/** Set on admins created with a temporary password; cleared once they choose their own. */
export function mustChangePassword(user: User): boolean {
  return user.app_metadata?.must_change_password === true;
}
