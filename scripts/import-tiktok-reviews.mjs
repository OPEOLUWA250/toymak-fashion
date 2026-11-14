/**
 * Copies the reviews in scripts/tiktok-reviews.json into the `reviews` table
 * as approved, verified TikTok Shop reviews for the shop-wide /reviews page.
 *
 *   node scripts/import-tiktok-reviews.mjs --dry-run   # check, write nothing
 *   node scripts/import-tiktok-reviews.mjs
 *
 * Needs docs/sql/0022_review_details.sql applied and .env.local with
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Safe to re-run:
 * rows are upserted on id. /reviews shows them within the hour, or straight
 * away after approving or deleting any review in the admin dashboard.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const FITS = new Set(["small", "as_expected", "large"]);
const dryRun = process.argv.includes("--dry-run");

const { listings } = JSON.parse(fs.readFileSync(new URL("./tiktok-reviews.json", import.meta.url), "utf8"));

const problems = [];
const seenIds = new Set();
const rows = [];
const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

for (const listing of listings) {
  for (const review of listing.reviews) {
    const where = `${review.id ?? "(no id)"} in "${listing.tiktok_listing}"`;
    if (!/^tt-\d{4,}$/.test(review.id ?? "")) problems.push(`${where}: id must look like tt-0001`);
    if (seenIds.has(review.id)) problems.push(`${where}: id used twice`);
    seenIds.add(review.id);
    if (!text(review.name)) problems.push(`${where}: name is missing`);
    if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) problems.push(`${where}: rating must be 1-5`);
    if (review.fit !== null && review.fit !== undefined && !FITS.has(review.fit)) problems.push(`${where}: fit must be small, as_expected, large or null`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.date ?? "") || Number.isNaN(Date.parse(review.date))) problems.push(`${where}: date must be YYYY-MM-DD`);

    rows.push({
      id: review.id,
      product_id: null,
      customer_name: text(review.name),
      rating: review.rating,
      comment: typeof review.comment === "string" ? review.comment.trim() : "",
      photo_urls: [],
      approved: true,
      source: "tiktok",
      verified: true,
      item_color: text(review.color),
      item_size: text(review.size),
      fit: review.fit ?? null,
      location: text(review.location),
      // Midday UTC is the same calendar day everywhere the date is shown.
      created_at: `${review.date}T12:00:00Z`,
    });
  }
}

if (problems.length) {
  console.error(`Nothing imported. Fix these in scripts/tiktok-reviews.json:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

if (dryRun) {
  console.log(`Dry run: ${rows.length} reviews are valid. Nothing written.`);
  process.exit(0);
}

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");

const { error } = await createClient(url, key).from("reviews").upsert(rows, { onConflict: "id" });
if (error) throw new Error(`Import failed: ${error.message}`);
console.log(`Imported ${rows.length} TikTok reviews.`);
