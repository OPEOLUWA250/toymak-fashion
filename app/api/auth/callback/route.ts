import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient } from "@/lib/server/admin-auth";

/** Landing point for Supabase email links (password reset). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/admin";
  // Only ever redirect within the admin area — never to another site.
  const safeNext = /^\/admin(\/[\w-]*)*$/.test(next) ? next : "/admin";

  if (code) {
    try {
      const { error } = await (await adminAuthClient()).auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
    } catch {
      // Falls through to the error redirect.
    }
  }
  return NextResponse.redirect(new URL("/admin/login?error=link", request.url));
}
