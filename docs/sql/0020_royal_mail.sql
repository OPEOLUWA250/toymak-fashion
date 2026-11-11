-- Royal Mail Click & Drop replaces Parcel2Go.
-- Run this in the Supabase SQL editor BEFORE deploying the Royal Mail version.
-- It only adds columns, so the site that's live now keeps working meanwhile.

-- The Royal Mail tracking number (from Click & Drop, or typed in by an admin).
alter table public.orders add column if not exists tracking_number text;
-- The order's Click & Drop record: sent / failed, its Click & Drop number and service.
alter table public.orders add column if not exists royal_mail jsonb;
-- When the customer was emailed their tracking number, so it's sent once.
alter table public.orders add column if not exists shipped_email_sent_at timestamptz;
-- Settings -> Royal Mail.
alter table public.store_settings add column if not exists royal_mail jsonb;

-- Keep the tracking numbers already saved on orders (they're Royal Mail numbers).
update public.orders
set tracking_number = upper(parcel2go_reference)
where tracking_number is null
  and parcel2go_reference is not null
  and parcel2go_reference !~* '^P2G';

-- Orders already shipped have had their news: don't email them again.
update public.orders
set shipped_email_sent_at = now()
where status = 'shipped' and shipped_email_sent_at is null;
