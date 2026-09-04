"use client";

import { useEffect, useState } from "react";
import { Review } from "./types";
import { invalidateReviewsCache } from "./use-reviews";

function reviveDates(reviews: Review[]): Review[] {
  return reviews.map((review) => ({
    ...review,
    created_at: new Date(review.created_at),
    updated_at: new Date(review.updated_at),
  }));
}

export function useAdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setIsLoading(true);
    fetch("/api/admin/reviews")
      .then((response) => response.json())
      .then((data: { reviews?: Review[] }) => setReviews(reviveDates(data.reviews ?? [])))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const setApproval = async (id: string, approved: boolean) => {
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (!response.ok) throw new Error("Failed to update review.");
    const data = await response.json();
    setReviews((current) =>
      current.map((review) => (review.id === id ? reviveDates([data.review])[0] : review)),
    );
    // Storefront ratings/lists cache the approved set — invalidate so the
    // change is reflected next time a page fetches it.
    invalidateReviewsCache();
  };

  const removeReview = async (id: string) => {
    const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete review.");
    setReviews((current) => current.filter((review) => review.id !== id));
    invalidateReviewsCache();
  };

  return { reviews, isLoading, refresh, setApproval, removeReview };
}
