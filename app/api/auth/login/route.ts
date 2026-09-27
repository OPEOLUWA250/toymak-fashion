import { NextRequest, NextResponse } from "next/server";
import { adminAuthClient, isAllowedAdminEmail } from "@/lib/server/admin-auth";
import { resolveAdminRole } from "@/lib/server/admin-roles";

const INVALID = "Incorrect email or password.";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { body = {}; }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  // Same message for "not an admin" as for a wrong password, so the login
  // form can't be used to discover which emails are admins.
  if (!(await isAllowedAdminEmail(email))) return NextResponse.json({ error: INVALID }, { status: 401 });

  try {
    const client = await adminAuthClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user || !(await resolveAdminRole(data.user))) {
      if (data?.session) await client.auth.signOut();
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    return NextResponse.json({ email: data.user.email });
  } catch {
    return NextResponse.json({ error: "Sign-in is unavailable right now. Please retry." }, { status: 500 });
  }
}
