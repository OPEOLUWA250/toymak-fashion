-- Phase 3 of the Supabase migration: contact form submissions.
-- Run this in the Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists contact_messages (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read')),
  created_at timestamptz not null default now()
);

-- Same reasoning as signups: real customer contact details, every access
-- goes through server routes using service_role, so RLS stays on with no
-- public policies at all.
alter table contact_messages enable row level security;
