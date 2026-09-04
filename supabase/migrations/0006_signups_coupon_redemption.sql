-- Tracks whether a welcome coupon code has been redeemed at checkout, so the
-- same code can't be applied to more than one order. Run this in the
-- Supabase Dashboard -> SQL Editor -> New query -> Run.

alter table signups add column if not exists coupon_redeemed_at timestamptz;
