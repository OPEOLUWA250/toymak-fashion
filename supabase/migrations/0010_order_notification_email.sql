-- Admin-configurable inbox that gets notified whenever a new order lands.
-- Blank means notifications are off. Run this in the Supabase Dashboard ->
-- SQL Editor -> New query -> Run.

alter table store_settings
  add column if not exists order_notification_email text not null default '';
