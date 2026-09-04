import { getSupabaseAdmin } from "./supabase";
import { Review } from "../types";

interface ReviewRow {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  photo_urls: string[];
  approved: boolean;
  created_at: string;
  updated_at: string;
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    product_id: row.product_id,
    customer_name: row.customer_name,
    rating: row.rating as Review["rating"],
    comment: row.comment,
    photo_urls: row.photo_urls,
    approved: row.approved,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export async function getApprovedReviewsForProduct(productId: string): Promise<Review[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data as ReviewRow[]).map(rowToReview);
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

/**
 * New reviews start unapproved — nothing a customer submits reaches the
 * storefront until someone on the team reviews it from the admin dashboard.
 */
export async function createReview(input: {
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const { data, error } = await getSupabaseAdmin()
    .from("reviews")
    .insert({
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      product_id: input.productId,
      customer_name: input.customerName,
      rating: input.rating,
      comment: input.comment,
      photo_urls: [],
      approved: false,
    })
    .select("*")
    .single();

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
