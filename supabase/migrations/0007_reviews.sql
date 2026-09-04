-- Customer-submitted product reviews. Anyone can submit one (through the
-- server-side API route, never directly from the browser); it only appears
-- on the storefront once an admin approves it from the dashboard. Run this
-- in the Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists reviews (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  photo_urls text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_product_id_idx on reviews (product_id);

drop trigger if exists reviews_set_updated_at on reviews;
create trigger reviews_set_updated_at
  before update on reviews
  for each row
  execute function set_updated_at();

-- Reads/writes all go through our own API routes (service_role), same
-- architecture as signups/contact_messages/orders — no public policies.
alter table reviews enable row level security;
