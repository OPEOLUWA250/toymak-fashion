import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/lib/server/paystack-orders";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  try {
    const verification = await verifyPaystackTransaction(reference);
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
