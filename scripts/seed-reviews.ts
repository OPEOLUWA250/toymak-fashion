/**
 * One-time migration: the 17 reviews that used to live in lib/mock-reviews.ts
 * (now deleted, superseded by the real `reviews` table + customer-submitted
 * reviews) are real historical review content, so they're preserved here as
 * already-approved rows instead of being lost. Safe to re-run — upserts on id.
 *
 * Requires migration 0007_reviews.sql to have been run first.
 * Run with: npx tsx scripts/seed-reviews.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

function loadEnvLocal() {
  const raw = fs.readFileSync(".env.local", "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const reviews = [
  { id: "rev-001", product_id: "prod-001", customer_name: "Amelia Foxton", rating: 5, comment: "Wore this under a fitted dress for a wedding and it was completely invisible. The compression is firm but I could still breathe and dance all night.", created_at: "2024-02-02" },
  { id: "rev-002", product_id: "prod-001", customer_name: "Priya Chandran", rating: 5, comment: "Genuinely the best shaper bra I've owned. True to size and the straps don't dig in like cheaper ones I've tried before.", created_at: "2024-02-14" },
  { id: "rev-003", product_id: "prod-001", customer_name: "Grace Odumosu", rating: 4, comment: "Great shaping and lift. Took a size up from my usual as recommended in the size guide and it fit perfectly.", created_at: "2024-03-01" },
  { id: "rev-004", product_id: "prod-002", customer_name: "Naomi Fitzgerald", rating: 5, comment: "The steel boning actually makes a difference — noticeably firmer support than the waist trainer I had before. Adjustable straps are a nice touch.", created_at: "2024-01-22" },
  { id: "rev-005", product_id: "prod-002", customer_name: "Chloe Bannister", rating: 4, comment: "Really solid for workouts, stays put and doesn't roll down. Took a couple of wears to break in.", created_at: "2024-02-09" },
  { id: "rev-006", product_id: "prod-002", customer_name: "Ifeoma Adeyemi", rating: 4, comment: "Good everyday support for posture. Runs slightly small so I'd size up if you're between sizes.", created_at: "2024-03-05" },
  { id: "rev-007", product_id: "prod-002", customer_name: "Sienna Wroe", rating: 5, comment: "Snatched waist within minutes of putting it on. Worth every penny.", created_at: "2024-03-18" },
  { id: "rev-008", product_id: "prod-003", customer_name: "Beatrice Lyall", rating: 5, comment: "Completely seamless under a silk skirt, exactly what I needed. The open gusset makes it so much easier to wear all day.", created_at: "2024-01-18" },
  { id: "rev-009", product_id: "prod-003", customer_name: "Temi Osaghae", rating: 5, comment: "My go-to bodysuit now. Breathable enough to wear the whole day at work without overheating.", created_at: "2024-02-11" },
  { id: "rev-010", product_id: "prod-003", customer_name: "Harriet Quansah", rating: 5, comment: "Nude shade matches my skin tone perfectly and it really is invisible under clothes.", created_at: "2024-02-27" },
  { id: "rev-011", product_id: "prod-004", customer_name: "Poppy Renshaw", rating: 4, comment: "Nice targeted compression without feeling restrictive. Looks natural under a t-shirt.", created_at: "2024-01-29" },
  { id: "rev-012", product_id: "prod-004", customer_name: "Yewande Bello", rating: 4, comment: "Does exactly what it says, comfortable for a full day of layering.", created_at: "2024-02-20" },
  { id: "rev-013", product_id: "prod-005", customer_name: "Eleanor Wickham", rating: 5, comment: "No more visible panty lines under fitted trousers. Smooths everything out nicely.", created_at: "2024-02-05" },
  { id: "rev-014", product_id: "prod-005", customer_name: "Modupe Alao", rating: 4, comment: "Comfortable mid-thigh length, doesn't ride up when walking around all day.", created_at: "2024-03-02" },
  { id: "rev-015", product_id: "prod-006", customer_name: "Charlotte Fenwick", rating: 5, comment: "Reinforced waistband is a game changer, it doesn't roll down like every other pair I've owned.", created_at: "2024-01-25" },
  { id: "rev-016", product_id: "prod-006", customer_name: "Aisha Bakare", rating: 5, comment: "Fantastic tummy control, wore it under a bodycon dress and felt so confident.", created_at: "2024-02-16" },
  { id: "rev-017", product_id: "prod-006", customer_name: "Freya Calthorpe", rating: 4, comment: "Great daily wear option, the caramel shade blends beautifully with my skin tone.", created_at: "2024-03-10" },
];

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(url, serviceRoleKey);

  const rows = reviews.map((review) => ({
    ...review,
    photo_urls: [],
    approved: true,
  }));

  const { error } = await supabase.from("reviews").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Failed to seed reviews: ${error.message}`);

  console.log(`Seeded ${rows.length} reviews.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
