import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { mustChangePassword, resolveAdminRole } from "@/lib/server/admin-roles";

/**
 * Guards the /admin pages: anyone who isn't a signed-in admin (super admin
 * or admin) is sent to /admin/login, and an admin still on a temporary
 * password is sent to /admin/reset-password. Also refreshes the Supabase
 * session cookies on each admin page load.
 *
 * This only protects pages. Admin API routes are wrapped in adminRoute()
 * (lib/server/admin-auth.ts), since they can be called directly.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let user: User | null = null;

  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values, headers) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    // Missing Supabase config or an unreachable auth server: treat as signed out.
  }

  const isAdmin = !!(await resolveAdminRole(user));
  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === "/admin/login";
  const resetPath = "/admin/reset-password";

  let destination: string | null = null;
  if (!isAdmin) {
    if (!onLoginPage) destination = `/admin/login?next=${encodeURIComponent(pathname + search)}`;
  } else if (mustChangePassword(user!)) {
    if (pathname !== resetPath) destination = resetPath;
  } else if (onLoginPage) {
    destination = "/admin";
  }

  if (destination) {
    const target = request.nextUrl.clone();
    const [targetPath, targetSearch = ""] = destination.split("?");
    target.pathname = targetPath;
    target.search = targetSearch ? `?${targetSearch}` : "";
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
