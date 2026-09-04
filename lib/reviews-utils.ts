import { Review } from "./types";

export type RatingsMap = Record<string, { average: number; count: number }>;

/**
 * Same aggregation the old mock-data getProductRating used — kept as a pure
 * function so both the server-rendered homepage and the client ratings hook
 * compute it identically from real Review[] data.
 */
export function computeRatingsMap(reviews: Review[]): RatingsMap {
  const byProduct = new Map<string, Review[]>();
  for (const review of reviews) {
    if (!review.approved) continue;
    const existing = byProduct.get(review.product_id);
    if (existing) {
      existing.push(review);
    } else {
      byProduct.set(review.product_id, [review]);
    }
  }

  const map: RatingsMap = {};
  for (const [productId, productReviews] of byProduct) {
    const total = productReviews.reduce((sum, review) => sum + review.rating, 0);
    map[productId] = {
      average: Math.round((total / productReviews.length) * 10) / 10,
      count: productReviews.length,
    };
  }
  return map;
}
