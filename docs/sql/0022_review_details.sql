-- Shop-wide reviews: reviews now live on the /reviews page instead of under a
-- product, and say where they came from (this site or TikTok Shop), whether
-- the purchase was verified, the colour/size bought, how it fits, and the
-- reviewer's country.
-- Run this in the Supabase SQL editor BEFORE deploying the reviews update.
-- It only adds columns and relaxes product_id, so the live site keeps working.

-- A shop review isn't about one product.
alter table public.reviews alter column product_id drop not null;

alter table public.reviews
  add column if not exists source text not null default 'website',
  add column if not exists verified boolean not null default false,
  -- The order that proved a website purchase. Never shown publicly.
  add column if not exists order_id text,
  add column if not exists item_color text,
  add column if not exists item_size text,
  add column if not exists fit text,
  add column if not exists location text;

alter table public.reviews drop constraint if exists reviews_source_check;
alter table public.reviews add constraint reviews_source_check
  check (source in ('website', 'tiktok'));

alter table public.reviews drop constraint if exists reviews_fit_check;
alter table public.reviews add constraint reviews_fit_check
  check (fit is null or fit in ('small', 'as_expected', 'large'));

-- One review per order, so an order number can't be reused to post a pile
-- of "verified" reviews.
create unique index if not exists reviews_order_key
  on public.reviews (order_id)
  where order_id is not null;
