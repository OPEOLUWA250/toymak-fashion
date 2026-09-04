"use client";

import { useEffect, useState } from "react";
import { Review } from "./types";
import { computeRatingsMap, RatingsMap } from "./reviews-utils";

// Module-level singleton so every ProductCard on a page (there can be
// dozens in a grid) shares one GET /api/reviews call instead of each
// firing its own — same idea as SWR's request de-duplication, hand-rolled
// since no data-fetching library is installed.
let allReviewsCache: Review[] | null = null;
let allReviewsPromise: Promise<Review[]> | null = null;

function fetchAllApprovedReviews(): Promise<Review[]> {
  if (allReviewsCache) return Promise.resolve(allReviewsCache);
  if (!allReviewsPromise) {
    allReviewsPromise = fetch("/api/reviews")
      .then((response) => response.json())
      .then((data: { reviews?: Review[] }) => {
        const reviews = data.reviews ?? [];
        allReviewsCache = reviews;
        return reviews;
      })
      .catch(() => {
        allReviewsPromise = null;
        return [];
      });
  }
  return allReviewsPromise;
}

export function invalidateReviewsCache() {
  allReviewsCache = null;
  allReviewsPromise = null;
}

export function useProductRatings(): RatingsMap {
  const [ratings, setRatings] = useState<RatingsMap>(() =>
    allReviewsCache ? computeRatingsMap(allReviewsCache) : {},
  );

  useEffect(() => {
    let cancelled = false;
    fetchAllApprovedReviews().then((reviews) => {
      if (!cancelled) setRatings(computeRatingsMap(reviews));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ratings;
}

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setIsLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((response) => response.json())
      .then((data: { reviews?: Review[] }) => setReviews(data.reviews ?? []))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return { reviews, isLoading, refresh };
}
