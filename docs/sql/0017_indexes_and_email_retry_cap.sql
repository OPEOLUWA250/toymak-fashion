-- Indexes for the queries the app runs most, and a retry cap for order
-- emails. Run in the Supabase Dashboard -> SQL Editor after 0016.
-- Safe to re-run.
--
-- The SQL editor runs a whole script as one transaction, so these use plain
-- CREATE INDEX (CONCURRENTLY isn't allowed there). Each briefly blocks
-- writes to its table while building, which is instant at this store's
-- size. On a much larger table, run CREATE INDEX CONCURRENTLY statements
-- one at a time instead.
begin;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_email_created_idx on public.orders (customer_email, created_at desc);
create index if not exists products_status_created_idx on public.products (status, created_at desc);
create index if not exists products_category_idx on public.products (category);
create index if not exists signups_coupon_code_idx on public.signups (coupon_code);
create index if not exists abandoned_carts_due_idx on public.abandoned_carts (updated_at)
  where recovery_email_sent_at is null;
create index if not exists order_email_outbox_pending_idx on public.order_email_outbox (created_at)
  where sent_at is null;

-- Order emails: stop retrying after 8 attempts. Rows left with
-- sent_at null and attempts >= 8 are the dead letters to look at:
--   select * from order_email_outbox where sent_at is null and attempts >= 8;
create or replace function public.claim_order_emails(target_order text default null)
returns setof order_email_outbox language sql security definer set search_path = public as $$
  update order_email_outbox set claimed_at=now(),attempts=attempts+1 where id in (
    select id from order_email_outbox where sent_at is null and attempts < 8
    and (claimed_at is null or claimed_at < now()-interval '10 minutes')
    and (target_order is null or order_id=target_order)
    order by created_at limit 20 for update skip locked
  ) returning *;
$$;
revoke all on function public.claim_order_emails(text) from public,anon,authenticated;
grant execute on function public.claim_order_emails(text) to service_role;

commit;
