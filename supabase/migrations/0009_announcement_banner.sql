-- Admin-controllable announcement banner (e.g. "Free shipping over £50")
-- shown above the header on every storefront page. Run this in the
-- Supabase Dashboard -> SQL Editor -> New query -> Run.

alter table store_settings
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_text text not null default 'Free shipping on all orders over £50.',
  add column if not exists announcement_link text not null default '/faq';
