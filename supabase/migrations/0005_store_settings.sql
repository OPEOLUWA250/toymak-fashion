-- Phase 5: store settings — tax and shipping per currency, plus the
-- exchange rates the product form uses to *suggest* NGN/USD prices from a
-- GBP entry (never auto-locked — the admin can always override).
-- Run this in the Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists store_settings (
  id text primary key default 'default',
  tax_gbp_percent numeric(5, 2) not null default 20,
  tax_ngn_percent numeric(5, 2) not null default 7.5,
  tax_usd_percent numeric(5, 2) not null default 0,
  shipping_threshold_gbp numeric(10, 2) not null default 50,
  shipping_cost_gbp numeric(10, 2) not null default 7.99,
  shipping_threshold_ngn numeric(12, 2) not null default 50000,
  shipping_cost_ngn numeric(12, 2) not null default 7999,
  shipping_threshold_usd numeric(10, 2) not null default 60,
  shipping_cost_usd numeric(10, 2) not null default 9.99,
  exchange_rate_gbp_to_ngn numeric(10, 2) not null default 2000,
  exchange_rate_gbp_to_usd numeric(10, 4) not null default 1.27,
  updated_at timestamptz not null default now()
);

-- Single-row config table — everything reads/writes the row with id='default'.
insert into store_settings (id) values ('default') on conflict (id) do nothing;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists store_settings_set_updated_at on store_settings;
create trigger store_settings_set_updated_at
  before update on store_settings
  for each row
  execute function set_updated_at();

-- Tax/shipping numbers aren't sensitive, but writes should still only ever
-- come from our own server routes (service_role bypasses RLS regardless).
alter table store_settings enable row level security;

create policy "Public can read store settings"
  on store_settings for select
  to anon, authenticated
  using (true);
