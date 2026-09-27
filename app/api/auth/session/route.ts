import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-auth";

/** Who's signed in to the admin dashboard, and their role (profile menu, sidebar). */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  return NextResponse.json(
    { email: session.email, role: session.role, mustChangePassword: session.mustChangePassword },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
