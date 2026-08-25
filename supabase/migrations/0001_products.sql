-- Phase 1 of the Supabase migration: the products catalog.
-- Run this in the Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists products (
  id text primary key,                 -- keeps existing IDs like "prod-001" so
                                        -- nothing elsewhere in the app has to change
  name text not null,
  description text not null,
  long_description text,
  price_gbp numeric(10, 2) not null,
  price_ngn numeric(12, 2) not null,
  price_usd numeric(10, 2),
  compare_at_price_gbp numeric(10, 2),
  category text not null check (
    category in ('shapewear', 'waist-trainer', 'bra', 'accessories', 'tops')
  ),
  sizes text[] not null default '{}',
  colors jsonb not null default '[]',  -- [{ name, hex, inventory }, ...]
  stock_qty integer not null default 0,
  low_stock_threshold integer not null default 0,
  sku text not null unique,
  images text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keeps updated_at current automatically on any row update — reused by
-- later migrations (orders, etc.) rather than redefined per table.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- Row Level Security: the storefront reads products directly and publicly,
-- but nothing should be able to write except our own server code, which
-- uses the service_role key and bypasses RLS entirely — so the only policy
-- needed here is public read access.
alter table products enable row level security;

drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select
  to anon, authenticated
  using (true);
