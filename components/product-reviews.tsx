"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Review } from "@/lib/types";
import { invalidateReviewsCache } from "@/lib/use-reviews";

function RatingSummary({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <p className="mt-2 text-sm text-neutral/60">No reviews yet for this product.</p>;
  }
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-neutral/60">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={15}
            className={i < Math.round(average) ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/10"}
          />
        ))}
      </div>
      <span className="font-semibold text-neutral">{average}</span>
      <span>
        out of 5 · {count} review{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <Star
              size={24}
              className={starValue <= value ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/20"}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ProductReviews({
  productId,
  initialReviews,
}: {
  productId: string;
  initialReviews: Review[];
}) {
  const [reviews] = useState<Review[]>(initialReviews);
  const [formOpen, setFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const average =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerName.trim() || !comment.trim() || rating === 0) {
      setError("Add your name, a star rating, and a comment before submitting.");
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerName, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit your review.");

      // Not approved yet, so it isn't added to the visible list here — that
      // would show content that isn't actually live. Once an admin approves
      // it, the next page load (or ratings hook refresh) will pick it up.
      invalidateReviewsCache();
      setStatus("submitted");
      setCustomerName("");
      setRating(0);
      setComment("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <section id="reviews" className="mt-20 border-t pt-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-neutral">Customer Reviews</h2>
          <RatingSummary average={average} count={reviews.length} />
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="rounded-md border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          {formOpen ? "Cancel" : "Write a review"}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 space-y-4 rounded-2xl border border-neutral/10 bg-[#fafafa] p-6"
        >
          {status === "submitted" ? (
            <p className="text-sm font-medium text-primary">
              Thanks! Your review has been submitted and will appear here once it&apos;s approved.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral">Your name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-neutral/15 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral">Rating</label>
                  <StarPicker value={rating} onChange={setRating} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral">Your review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="What did you think?"
                  className="w-full rounded-xl border border-neutral/15 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" && <Loader2 size={14} className="animate-spin" />}
                {status === "submitting" ? "Submitting…" : "Submit review"}
              </button>
            </>
          )}
        </form>
      )}

      {reviews.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-neutral/10 bg-white p-6 shadow-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/10"}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral/75">{review.comment}</p>
              <div className="mt-4 flex items-center justify-between border-t border-neutral/10 pt-3">
                <span className="text-sm font-semibold text-neutral">{review.customer_name}</span>
                <span className="text-xs text-neutral/45">
                  {review.created_at.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
