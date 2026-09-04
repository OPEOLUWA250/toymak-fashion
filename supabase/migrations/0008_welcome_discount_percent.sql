-- Makes the welcome coupon's discount rate admin-editable from Settings,
-- instead of hardcoded in the app. Run this in the Supabase Dashboard ->
-- SQL Editor -> New query -> Run.

alter table store_settings
  add column if not exists welcome_discount_percent numeric(5, 2) not null default 15;
