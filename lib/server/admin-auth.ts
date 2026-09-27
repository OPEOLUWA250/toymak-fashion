import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { runAsAdmin } from "./supabase";
import { AdminRole, isAllowedAdminEmail, mustChangePassword, resolveAdminRole } from "./admin-roles";

/**
 * Admin authentication: Supabase Auth (email + password) sessions stored in
 * cookies. Being signed in is not enough — the account must also be a super
 * admin (ADMIN_EMAILS) or an admin (admin_users table). See admin-roles.ts.
 */
export { isAllowedAdminEmail };
export type { AdminRole };

export interface AdminSession {
  user: User;
  email: string;
  role: AdminRole;
  /** True until an admin created with a temporary password sets their own. */
  mustChangePassword: boolean;
}

export async function adminAuthClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server components can't set cookies; proxy.ts refreshes the
          // session on every /admin page load instead.
        }
      },
    },
  });
}

/** The signed-in admin, including one who still has to change a temporary password. Never throws. */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const client = await adminAuthClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    const role = await resolveAdminRole(user);
    if (!role) return null;
    return { user, email: user.email!.toLowerCase(), role, mustChangePassword: mustChangePassword(user) };
  } catch {
    return null;
  }
}

/** A fully active admin (temporary password already replaced), or null. */
export async function getAdmin(): Promise<User | null> {
  const session = await getAdminSession();
  return session && !session.mustChangePassword ? session.user : null;
}

function deny(session: AdminSession | null): NextResponse | null {
  if (!session) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  if (session.mustChangePassword) {
    return NextResponse.json({ error: "Set a new password before continuing." }, { status: 403 });
  }
  return null;
}

/** Denial response for a missing/insufficient admin session, or null when allowed. */
function checkAccess(session: AdminSession | null, superAdmin: boolean): NextResponse | null {
  const denied = deny(session);
  if (denied) return denied;
  if (superAdmin && session!.role !== "super_admin") {
    return NextResponse.json({ error: "Only a super admin can manage admins." }, { status: 403 });
  }
  return null;
}

/**
 * Wraps an admin API handler: rejects anyone who isn't a signed-in admin
 * (or super admin, with `{ superAdmin: true }`), then runs the handler with
 * its database writes attributed to that admin in the activity log.
 * Every admin route must use this — proxy.ts only protects pages.
 *
 *   export const GET = adminRoute(async (request, context, session) => { ... });
 */
export function adminRoute<C = unknown>(
  handler: (request: NextRequest, context: C, session: AdminSession) => Response | Promise<Response>,
  options: { superAdmin?: boolean } = {},
) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    const session = await getAdminSession();
    const denied = checkAccess(session, options.superAdmin ?? false);
    if (denied) return denied;
    return runAsAdmin(session!.email, () => handler(request, context, session!));
  };
}
