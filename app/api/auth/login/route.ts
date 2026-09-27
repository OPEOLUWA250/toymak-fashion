import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, isAllowedAdminEmail } from "@/lib/server/admin-auth";
import { resolveAdminRole } from "@/lib/server/admin-roles";

const INVALID = "Incorrect email or password.";

// The screen always shows the same message (so the form can't be used to
// find out who the admins are); the real reason goes to the server log.
function refuse(email: string, reason: string, status = 401) {
  console.warn(`Admin sign-in refused for ${email}: ${reason}`);
  return NextResponse.json({ error: INVALID }, { status });
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  if (!(await isAllowedAdminEmail(email))) {
    return refuse(email, "not in ADMIN_EMAILS or on the Admins page (is ADMIN_EMAILS set for this deployment?)");
  }

  try {
    const client = await adminAuthClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return refuse(email, `Supabase rejected the sign-in: ${error?.message ?? "no user returned"}`);
    if (!(await resolveAdminRole(data.user))) {
      await client.auth.signOut();
      return refuse(email, "signed in, but the account isn't an admin (unconfirmed email, or removed from the Admins page)");
    }
    return NextResponse.json({ email: data.user.email });
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    return NextResponse.json({ error: "Sign-in is unavailable right now. Please retry." }, { status: 500 });
  }
}
