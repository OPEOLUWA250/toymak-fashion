import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/admin-auth";
import { Parcel2GoRefusal } from "@/lib/server/parcel2go";
import { bookOrderOnParcel2Go } from "@/lib/server/parcel2go-booking";

export const dynamic = "force-dynamic";
// Quote, create and pay: three Parcel2Go calls.
export const maxDuration = 60;

/**
 * "Book with Parcel2Go" on an order: books it, retries a failed booking, or
 * pays for one that's waiting for payment. Answers with the order as it now
 * stands and, when it didn't fully work, why.
 */
export const POST = adminRoute(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { order, error } = await bookOrderOnParcel2Go(id, "manual");
    return NextResponse.json({ order, error });
  } catch (error) {
    const status = error instanceof Parcel2GoRefusal ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not book this order." }, { status });
  }
});
