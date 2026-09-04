-- Captured the moment someone at checkout has entered a valid email and has
-- items in their cart — before they've necessarily paid. A scheduled job
-- (see app/api/cron/abandoned-carts) emails anyone still sitting here after
-- an hour with no completed order. Run this in the Supabase Dashboard ->
-- SQL Editor -> New query -> Run.

create table if not exists abandoned_carts (
  id text primary key, -- normalized email; one row per customer, upserted on every checkout visit
  email text not null,
  customer_name text,
  items jsonb not null,
  currency text not null check (currency in ('GBP', 'NGN', 'USD')),
  subtotal numeric(12, 2) not null,
  recovery_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists abandoned_carts_set_updated_at on abandoned_carts;
create trigger abandoned_carts_set_updated_at
  before update on abandoned_carts
  for each row
  execute function set_updated_at();

-- Reads/writes all go through our own API routes (service_role) — no
-- public policies, same architecture as every other real-customer-data table.
alter table abandoned_carts enable row level security;
