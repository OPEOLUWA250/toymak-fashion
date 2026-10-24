-- Admin-managed product categories. Replaces the fixed list in the
-- products.category check constraint with a table the dashboard can edit.
-- Run in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run.
begin;

create table if not exists public.product_categories (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- slug used in URLs (?category=...)
  label text not null check (length(trim(label)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.product_categories (id, label, sort_order) values
  ('shapewear', 'Shapewear', 1),
  ('waist-trainer', 'Waist Trainers', 2),
  ('bra', 'Bras', 3),
  ('tops', 'Tops', 4),
  ('accessories', 'Accessories', 5)
on conflict (id) do nothing;

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();

-- The storefront may read categories; only the server (service role) writes.
alter table public.product_categories enable row level security;
drop policy if exists "Public can read product categories" on public.product_categories;
create policy "Public can read product categories" on public.product_categories
  for select to anon, authenticated using (true);

-- Products must use a category from the table, and a category can't be
-- deleted while products still use it.
alter table public.products drop constraint if exists products_category_check;
alter table public.products drop constraint if exists products_category_fkey;
alter table public.products add constraint products_category_fkey
  foreign key (category) references public.product_categories(id) on delete restrict;

-- Record category changes in the activity log (function from 0012).
drop trigger if exists product_categories_audit on public.product_categories;
create trigger product_categories_audit after insert or update or delete on public.product_categories
  for each row execute function public.audit_store_change();

commit;
