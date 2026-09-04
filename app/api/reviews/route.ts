import { NextRequest, NextResponse } from "next/server";
import { createReview, getAllApprovedReviews, getApprovedReviewsForProduct } from "@/lib/server/reviews";

const MAX_COMMENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 80;

/**
 * ?productId=X returns that product's approved reviews. No productId
 * returns every approved review site-wide, used by the ratings hook to
 * compute each product card's star average in a single request.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");

  try {
    const reviews = productId
      ? await getApprovedReviewsForProduct(productId)
      : await getAllApprovedReviews();
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load reviews." },
      { status: 500 },
    );
  }
}

interface SubmitReviewBody {
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<SubmitReviewBody>;
  const { productId, customerName, rating, comment } = body;

  if (!productId || !customerName?.trim() || !comment?.trim()) {
    return NextResponse.json({ error: "Name, rating, and a comment are required." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (customerName.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  if (comment.trim().length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: "Review is too long." }, { status: 400 });
  }

  try {
    const review = await createReview({
      productId,
      customerName: customerName.trim(),
      rating: rating as number,
      comment: comment.trim(),
    });
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit review." },
      { status: 500 },
    );
  }
}
