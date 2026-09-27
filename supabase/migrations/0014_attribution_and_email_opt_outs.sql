-- Run after 0013_admin_users.sql. Safe to re-run.
begin;

-- 1. Activity log attribution. The server sends the signed-in admin's email
--    in the x-toymak-actor request header (lib/server/supabase.ts), which
--    PostgREST exposes as request.headers. Changes without it come from
--    checkout, payment webhooks or other automatic jobs.
create or replace function public.audit_store_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor text;
begin
  begin
    actor := left(nullif(current_setting('request.headers', true), '')::json ->> 'x-toymak-actor', 254);
  exception when others then
    actor := null;
  end;
  insert into admin_activity(actor, action, entity_id, details)
  values(coalesce(actor, auth.uid()::text, 'System or customer'), TG_TABLE_NAME || ':' || TG_OP,
    coalesce(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id', 'store'),
    jsonb_build_object('changed_fields', (select coalesce(jsonb_agg(key), '[]') from jsonb_each(coalesce(to_jsonb(NEW),'{}')) where value is distinct from to_jsonb(OLD)->key)));
  return coalesce(NEW, OLD);
end $$;

-- 2. People who unsubscribed from abandoned-cart reminder emails.
create table if not exists public.email_opt_outs (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
-- No policies: only the server (service role) can read or change it.
alter table public.email_opt_outs enable row level security;

-- 3. Cooldown for re-sending a first-order coupon email.
alter table public.signups add column if not exists email_last_sent_at timestamptz;

commit;
