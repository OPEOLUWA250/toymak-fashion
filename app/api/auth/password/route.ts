import { NextRequest, NextResponse } from "next/server";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin-password";
import { adminAuthClient, getAdminSession } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

/**
 * Sets a new password for the signed-in admin — after a reset link, to
 * change it, or to replace a temporary password from a super admin (the one
 * action allowed while that's still pending).
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });

  let body: { password?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || password.length > 200) {
    return NextResponse.json({ error: `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  try {
    const { error } = await (await adminAuthClient()).auth.updateUser({ password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (session.mustChangePassword) {
      const { error: flagError } = await getSupabaseAdmin().auth.admin.updateUserById(session.user.id, {
        app_metadata: { must_change_password: false },
      });
      if (flagError) {
        return NextResponse.json({ error: "Password saved, but please sign in again to continue." }, { status: 500 });
      }
    }
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: "Could not update your password. Please retry." }, { status: 500 });
  }
}
