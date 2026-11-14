"use client";

import { useId, useMemo, useState } from "react";
import { BadgeCheck, Loader2, Star, X } from "lucide-react";
import { Review } from "@/lib/types";
import { FIT_LABELS, reviewItemLabel, summarizeReviews, type ReviewSummary } from "@/lib/reviews-utils";

const PAGE_SIZE = 8;

const inputClass =
  "w-full rounded-xl border border-neutral/15 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/40 focus:border-primary";

export function Stars({ rating, size }: { rating: number; size: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`} role="img">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/10"}
        />
      ))}
    </div>
  );
}

function formatReviewDate(date: Date) {
  // Fixed time zone so the server render and the browser agree.
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

function Summary({
  summary,
  starFilter,
  onFilter,
}: {
  summary: ReviewSummary;
  starFilter: number | null;
  onFilter: (stars: number | null) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <span className="text-5xl font-bold leading-none text-neutral">{summary.average.toFixed(1)}</span>
        <div className="pb-1">
          <Stars rating={summary.average} size={16} />
          <p className="mt-1 text-sm text-neutral/55">
            {summary.count} review{summary.count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5" aria-label="Filter reviews by rating">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.stars[stars - 1];
          const active = starFilter === stars;
          return (
            <li key={stars}>
              <button
                type="button"
                disabled={count === 0}
                aria-pressed={active}
                onClick={() => onFilter(active ? null : stars)}
                className={`flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-sm transition disabled:cursor-default disabled:opacity-50 ${
                  active ? "bg-primary/10" : "enabled:hover:bg-neutral/5"
                }`}
              >
                <span className="flex w-8 shrink-0 items-center gap-1 text-neutral/70">
                  {stars} <Star size={12} aria-hidden className="fill-amber-400 text-amber-400" />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral/10">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-neutral/55">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const item = reviewItemLabel(review);
  const initial = (Array.from(review.customer_name.trim())[0] ?? "?").toUpperCase();

  return (
    <article className="rounded-2xl border border-neutral/10 bg-white p-5 shadow-sm">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-neutral">{review.customer_name}</p>
          {review.location && <p className="text-sm text-neutral/55">{review.location}</p>}
        </div>
        {review.source === "tiktok" && (
          <span className="shrink-0 rounded-full bg-neutral/5 px-2.5 py-1 text-[11px] font-medium text-neutral/60">
            TikTok Shop
          </span>
        )}
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} size={16} />
        {review.verified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <BadgeCheck size={14} aria-hidden /> Verified purchase
          </span>
        )}
      </div>

      {review.comment && (
        <p className="mt-3 whitespace-pre-line text-[15px] leading-6 text-neutral/85">{review.comment}</p>
      )}

      {(item || review.fit) && (
        <p className="mt-3 text-sm text-neutral/55">
          {item && <>Item: {item}</>}
          {item && review.fit && <span className="mx-1.5 text-neutral/25">|</span>}
          {review.fit && <>Fit: {FIT_LABELS[review.fit]}</>}
        </p>
      )}

      <p className="mt-2 text-sm text-neutral/45">{formatReviewDate(review.created_at)}</p>
    </article>
  );
}

function ReviewForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerName.trim() || !comment.trim() || rating === 0) {
      setError("Add your name, a star rating, and your review before submitting.");
      return;
    }
    if (Boolean(orderEmail.trim()) !== Boolean(orderNumber.trim())) {
      setError("To verify your purchase, enter both your checkout email and your order number.");
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, rating, comment, orderEmail, orderNumber, company }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not submit your review.");
      // Not approved yet, so it isn't added to the list — it only shows once it's live.
      setVerified(Boolean(data.verified));
      setStatus("submitted");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "submitted") {
    return (
      <div role="status" className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <p className="font-semibold text-neutral">Thank you for your review!</p>
        <p className="mt-1 text-sm text-neutral/70">
          {verified && "Your purchase is verified. "}
          It will appear here once our team has checked it, usually within a day or two.
        </p>
        <button type="button" onClick={onClose} className="mt-4 text-sm font-semibold text-primary underline underline-offset-4">
          Close
        </button>
      </div>
    );
  }

  const shownRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} noValidate className="relative space-y-5 rounded-2xl border border-neutral/10 bg-[#fafafa] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral">Write a review</h2>
        <button type="button" onClick={onClose} aria-label="Close review form" className="-m-1 p-1 text-neutral/50 hover:text-neutral">
          <X size={18} />
        </button>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-neutral">Your rating</legend>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={rating === value}
                  className="p-0.5"
                >
                  <Star
                    size={28}
                    aria-hidden
                    className={value <= shownRating ? "fill-amber-400 text-amber-400" : "fill-neutral/10 text-neutral/20"}
                  />
                </button>
              );
            })}
          </div>
          {shownRating > 0 && (
            <span className="text-sm text-neutral/60">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][shownRating]}
            </span>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor={`${id}-comment`} className="text-sm font-medium text-neutral">Your review</label>
        <textarea
          id={`${id}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What did you buy, and how do you feel in it? How was delivery?"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium text-neutral">Display name</label>
        <input
          id={`${id}-name`}
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={80}
          autoComplete="given-name"
          placeholder="e.g. Amaka O."
          className={inputClass}
        />
        <p className="text-xs text-neutral/50">Shown with your review. First name and an initial is plenty.</p>
      </div>

      <details className="rounded-xl border border-neutral/10 bg-white px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral">
          <BadgeCheck size={16} aria-hidden className="shrink-0 text-emerald-700" />
          Bought from us? Add your order to get a &ldquo;Verified purchase&rdquo; badge
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${id}-email`} className="text-sm font-medium text-neutral">Checkout email</label>
            <input
              id={`${id}-email`}
              type="email"
              value={orderEmail}
              onChange={(e) => setOrderEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-order`} className="text-sm font-medium text-neutral">Order number</label>
            <input
              id={`${id}-order`}
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="TMK-AB12CD"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-neutral/50 sm:col-span-2">
            Your order number is in your confirmation email. We only use these to check the order; they&apos;re never shown.
          </p>
        </div>
      </details>

      {/* Hidden from people; bots that fill every field are ignored. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" && <Loader2 size={14} className="animate-spin" />}
        {status === "submitting" ? "Submitting…" : "Submit review"}
      </button>
      <p className="text-xs text-neutral/50">Reviews are checked by our team before they appear.</p>
    </form>
  );
}

/** Every approved review for the shop, with the form to add one. Used on /reviews. */
export function ShopReviews({ reviews }: { reviews: Review[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const summary = useMemo(() => summarizeReviews(reviews), [reviews]);
  const filtered = useMemo(
    () => (starFilter ? reviews.filter((review) => review.rating === starFilter) : reviews),
    [reviews, starFilter],
  );
  const hasTikTok = reviews.some((review) => review.source === "tiktok");

  const filterBy = (stars: number | null) => {
    setStarFilter(stars);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-14">
      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        {reviews.length > 0 ? (
          <Summary summary={summary} starFilter={starFilter} onFilter={filterBy} />
        ) : (
          <p className="text-sm text-neutral/60">No reviews yet. Shopped with us? Be the first to tell others what you think.</p>
        )}
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
          >
            Write a review
          </button>
        )}
        {hasTikTok && (
          <p className="text-xs leading-5 text-neutral/50">
            Includes reviews left on our TikTok Shop, shown as they appear there. &ldquo;Verified purchase&rdquo; means the
            order was confirmed by TikTok Shop or on this site.
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        {formOpen && <ReviewForm onClose={() => setFormOpen(false)} />}

        {starFilter && (
          <div className="flex items-center justify-between gap-3 text-sm text-neutral/60">
            <span>
              Showing {filtered.length} {starFilter}-star review{filtered.length === 1 ? "" : "s"}
            </span>
            <button type="button" onClick={() => filterBy(null)} className="font-semibold text-primary underline underline-offset-4">
              Show all
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.slice(0, visible).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        {filtered.length > visible && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              className="rounded-md border border-neutral/15 px-6 py-3 text-sm font-semibold text-neutral transition hover:border-primary hover:text-primary"
            >
              Show more reviews ({filtered.length - visible} more)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
