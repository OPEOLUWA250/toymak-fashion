import { NextRequest, NextResponse } from "next/server";
import { deleteReview, updateReviewApproval } from "@/lib/server/reviews";
import { adminRoute } from "@/lib/server/admin-auth";

export const PUT = adminRoute(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json()) as { approved?: boolean };

  if (typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "approved must be a boolean." }, { status: 400 });
  }

  try {
    const review = await updateReviewApproval(id, body.approved);
    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update review." },
      { status: 500 },
    );
  }
});

export const DELETE = adminRoute(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  try {
    await deleteReview(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete review." },
      { status: 500 },
    );
  }
});
