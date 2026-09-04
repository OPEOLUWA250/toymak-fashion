-- Phase 2 of the Supabase migration: newsletter signups.
-- Run this in the Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists signups (
  id text primary key,
  first_name text not null,
  last_name text not null,
  email text not null unique,  -- server-side duplicate protection, global —
                                -- the old localStorage version only caught
                                -- repeats from the same browser
  coupon_code text not null,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- No public read/write policy: this table only has real customer emails in
-- it, and every access goes through our own server routes using the
-- service_role key, which bypasses RLS. Enabling RLS with zero policies
-- means "nobody, via the public API, ever" — the safest default.
alter table signups enable row level security;
