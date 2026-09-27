import { NextRequest, NextResponse } from "next/server";
import { verifyEmailLinkToken } from "@/lib/server/email-links";
import { optOutOfCartEmails } from "@/lib/server/abandoned-carts";

/**
 * Unsubscribes from abandoned-cart reminders. POST only, so link scanners
 * that pre-open email links can't unsubscribe people by accident. Accepts
 * the token in the query string (one-click unsubscribe from mail apps, via
 * the List-Unsubscribe header) or in a JSON body (the /unsubscribe page).
 */
export async function POST(request: NextRequest) {
  let token: unknown = request.nextUrl.searchParams.get("token");
  if (!token && request.headers.get("content-type")?.includes("application/json")) {
    try { ({ token } = await request.json()); } catch { token = null; }
  }
  const email = verifyEmailLinkToken("unsubscribe", token);
  if (!email) return NextResponse.json({ error: "This unsubscribe link isn't valid." }, { status: 400 });

  try {
    await optOutOfCartEmails(email);
    return NextResponse.json({ unsubscribed: true });
  } catch {
    return NextResponse.json({ error: "Could not unsubscribe you right now. Please retry." }, { status: 500 });
  }
}
