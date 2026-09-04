"use client";

import { useState } from "react";
import { Check, MessageSquareText, Star, Trash2, X } from "lucide-react";
import { Review } from "@/lib/types";

export function ReviewsView({
  reviews,
  onApprove,
  onReject,
  onDelete,
}: {
  reviews: Review[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = reviews.filter((review) => !review.approved);
  const approved = reviews.filter((review) => review.approved);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <MessageSquareText size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Pending review</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{pending.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Star size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Live on storefront</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{approved.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">Awaiting approval</h2>
          <p className="text-sm text-neutral-500">
            Submitted from product pages. Nothing here shows on the storefront until you approve it.
          </p>
        </div>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
            No reviews waiting on you right now.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((review) => (
              <div key={review.id} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900">{review.customer_name}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      Product: {review.product_id} · {review.created_at.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">{review.comment}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => runAction(review.id, () => onApprove(review.id))}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => runAction(review.id, () => onDelete(review.id))}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-none border border-neutral-200 bg-white p-5 lg:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-neutral-900">Live reviews</h2>
          <p className="text-sm text-neutral-500">Currently visible on product pages.</p>
        </div>

        {approved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-neutral-500">
            No approved reviews yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-left">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Customer</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Product</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Rating</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Review</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {approved.map((review) => (
                    <tr key={review.id}>
                      <td className="px-4 py-4 align-top text-sm font-medium text-neutral-900">{review.customer_name}</td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-500">{review.product_id}</td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-600">{review.rating} / 5</td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-600">
                        <p className="max-w-md">{review.comment}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <button
                          type="button"
                          disabled={busyId === review.id}
                          onClick={() => runAction(review.id, () => onDelete(review.id))}
                          aria-label="Delete review"
                          className="p-2 text-neutral-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
