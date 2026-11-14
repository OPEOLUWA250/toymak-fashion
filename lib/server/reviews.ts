import { getSupabaseAdmin } from "./supabase";
import { Review, ReviewFit, ReviewSource } from "../types";

interface ReviewRow {
  id: string;
  product_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  photo_urls: string[] | null;
  approved: boolean;
  // Absent until docs/sql/0022_review_details.sql has run.
  source?: ReviewSource | null;
  verified?: boolean | null;
  item_color?: string | null;
  item_size?: string | null;
  fit?: ReviewFit | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

// Lists only public fields: the row's order_id (which proved a purchase) is
// never sent to the browser.
function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    product_id: row.product_id,
    customer_name: row.customer_name,
    rating: row.rating as Review["rating"],
    comment: row.comment ?? "",
    photo_urls: row.photo_urls ?? [],
    approved: row.approved,
    source: row.source ?? "website",
    verified: row.verified ?? false,
    item_color: row.item_color ?? null,
    item_size: row.item_size ?? null,
    fit: row.fit ?? null,
    location: row.location ?? null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export async function getAllApprovedReviews(): Promise<Review[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data as ReviewRow[]).map(rowToReview);
}

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data as ReviewRow[]).map(rowToReview);
}

/** That order was already used for a review. */
export class DuplicateReviewError extends Error {
  constructor() {
    super("You've already left a review for that order. Thank you!");
  }
}

/**
 * A shop-wide review from the /reviews page. New reviews start unapproved —
 * nothing a customer submits is shown until someone on the team approves it
 * from the admin dashboard.
 */
export async function createReview(input: {
  customerName: string;
  rating: number;
  comment: string;
  location?: string | null;
  /** Set only when the reviewer proved the purchase with their order. */
  orderId?: string | null;
}): Promise<Review> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .insert({
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      product_id: null,
      customer_name: input.customerName,
      rating: input.rating,
      comment: input.comment,
      photo_urls: [],
      approved: false,
      source: "website",
      verified: Boolean(input.orderId),
      order_id: input.orderId ?? null,
      location: input.location ?? null,
    })
    .select("*")
    .single();

  if (error?.code === "23505") throw new DuplicateReviewError();
  if (error) throw new Error(`Failed to submit review: ${error.message}`);
  return rowToReview(data as ReviewRow);
}

export async function updateReviewApproval(id: string, approved: boolean): Promise<Review | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .update({ approved })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`Failed to update review ${id}: ${error.message}`);
  return data ? rowToReview(data as ReviewRow) : null;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("reviews").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete review ${id}: ${error.message}`);
}
