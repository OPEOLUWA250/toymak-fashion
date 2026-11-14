import { Review, ReviewFit } from "./types";

export const FIT_LABELS: Record<ReviewFit, string> = {
  small: "Runs small",
  as_expected: "Fits as expected",
  large: "Runs large",
};

export function averageRating(reviews: Pick<Review, "rating">[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Number of reviews per star, index 0 = 1 star … index 4 = 5 stars. */
  stars: [number, number, number, number, number];
}

export function summarizeReviews(reviews: Pick<Review, "rating">[]): ReviewSummary {
  const stars: ReviewSummary["stars"] = [0, 0, 0, 0, 0];
  for (const review of reviews) stars[review.rating - 1] += 1;
  return { average: averageRating(reviews), count: reviews.length, stars };
}

/** "Black, L" — whichever of the colour and size the reviewer bought is known. */
export function reviewItemLabel(review: Pick<Review, "item_color" | "item_size">): string {
  return [review.item_color, review.item_size].filter(Boolean).join(", ");
}
