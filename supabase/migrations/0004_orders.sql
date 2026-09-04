-- Phase 4 of the Supabase migration: orders — the highest-stakes table,
-- real money and real customers. Run this in the Supabase Dashboard ->
-- SQL Editor -> New query -> Run.

create table if not exists orders (
  id text primary key,
  tracking_id text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  status text not null default 'unshipped' check (status in ('unshipped', 'shipped')),
  tracking_link text,
  currency text not null check (currency in ('GBP', 'NGN', 'USD')),
  payment_gateway text not null check (payment_gateway in ('stripe', 'paystack')),
  payment_reference text not null unique,  -- idempotency: Stripe/Paystack both
                                            -- retry webhook delivery, and this
                                            -- constraint is what stops a retry
                                            -- from creating a duplicate order
  items jsonb not null,                    -- OrderItem[]
  subtotal numeric(12, 2) not null,
  shipping_cost numeric(12, 2) not null,
  tax numeric(12, 2) not null,
  discount_applied numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

-- Real orders, real customer data — service_role only, same as signups and
-- contact_messages. No public policies.
alter table orders enable row level security;
