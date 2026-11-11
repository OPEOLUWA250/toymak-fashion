-- Removes what's left of Parcel2Go.
-- Run this only AFTER the Royal Mail version is live on toymakfashion.com
-- (the older version still reads these columns).

-- Any tracking number saved by the older version in the meantime.
update public.orders
set tracking_number = upper(parcel2go_reference)
where tracking_number is null
  and parcel2go_reference is not null
  and parcel2go_reference !~* '^P2G';

alter table public.orders
  drop column if exists parcel2go_reference,
  drop column if exists parcel2go_booking,
  drop column if exists delivery_tracking,
  drop column if exists delivery_notified_stage;

alter table public.store_settings
  drop column if exists parcel2go_booking;
