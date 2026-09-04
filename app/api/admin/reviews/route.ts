import { NextResponse } from "next/server";
import { getAllReviews } from "@/lib/server/reviews";

export async function GET() {
  try {
    const reviews = await getAllReviews();
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load reviews." },
      { status: 500 },
    );
  }
}
