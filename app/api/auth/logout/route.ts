import { NextResponse } from "next/server";
import { adminAuthClient } from "@/lib/server/admin-auth";

export async function POST() {
  try {
    await (await adminAuthClient()).auth.signOut();
    return NextResponse.json({ signedOut: true });
  } catch {
    return NextResponse.json({ error: "Could not sign out. Please retry." }, { status: 500 });
  }
}
