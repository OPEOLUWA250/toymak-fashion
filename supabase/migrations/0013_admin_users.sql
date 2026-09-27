-- Dashboard admins and super admins created from the Admins page. Owners in
-- the ADMIN_EMAILS environment variable are super admins too but are not
-- stored here, so they can never be locked out from inside the dashboard.
-- Run after 0012_store_reliability.sql.
begin;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_by text not null,
  created_at timestamptz not null default now()
);
-- For databases where an earlier draft of this migration created the
-- table without roles. Safe to re-run.
alter table public.admin_users
  add column if not exists role text not null default 'admin' check (role in ('admin', 'super_admin'));
-- No policies: only the server (service role) can read or change admins.
alter table public.admin_users enable row level security;

-- Record admin additions, role changes and removals in the activity log
-- (function from 0012).
drop trigger if exists admin_users_audit on public.admin_users;
create trigger admin_users_audit after insert or update or delete on public.admin_users
  for each row execute function public.audit_store_change();

commit;
