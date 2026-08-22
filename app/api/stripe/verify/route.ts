import { NextRequest, NextResponse } from "next/server";
import { verifyStripeSession } from "@/lib/server/stripe-orders";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  try {
    const verification = await verifyStripeSession(sessionId);
    if (!verification) {
      return NextResponse.json({ status: "failed" });
    }
    return NextResponse.json(verification);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify this transaction." },
      { status: 500 },
    );
  }
}
