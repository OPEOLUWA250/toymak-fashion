import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, isAllowedAdminEmail } from "@/lib/server/admin-auth";

/**
 * Emails a password-reset link to an admin. Always answers the same way, so
 * it can't be used to discover which emails are admins. The link must be
 * opened in the same browser (Supabase's PKCE flow keeps a verifier cookie).
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (email && (await isAllowedAdminEmail(email))) {
    try {
      const redirectTo = `${request.nextUrl.origin}/api/auth/callback?next=/admin/reset-password`;
      await (await adminAuthClient()).auth.resetPasswordForEmail(email, { redirectTo });
    } catch {
      // Swallowed on purpose — the response must not reveal anything.
    }
  }

  return NextResponse.json({ sent: true });
}
