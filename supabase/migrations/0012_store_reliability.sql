-- Apply before deploying the corresponding application changes.
begin;
alter table public.products add column if not exists status text not null default 'active' check (status in ('active','draft','archived'));
alter table public.products add column if not exists variants jsonb not null default '[]';
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products for select to anon, authenticated using (status = 'active');
alter table public.orders add column if not exists refunded_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists fulfillment_issue text;

create table if not exists public.checkout_snapshots (
  id uuid primary key, gateway text not null, verification jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.checkout_snapshots enable row level security;

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(), order_id text not null references public.orders(id),
  customer_email text not null, reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','received','refunded')),
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  refund_reference text, notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists one_open_return_per_order on public.return_requests(order_id) where status <> 'rejected';
alter table public.return_requests enable row level security;

create table if not exists public.admin_activity (
  id bigint generated always as identity primary key,
  actor text not null, action text not null, entity_id text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.admin_activity enable row level security;

-- Trigger records mutations in the same transaction. Until admin auth is
-- enabled, the actor is explicitly unknown rather than a fabricated identity.
create or replace function public.audit_store_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into admin_activity(actor, action, entity_id, details)
  values(coalesce(auth.uid()::text, 'Unverified admin or system'), TG_TABLE_NAME || ':' || TG_OP,
    coalesce(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id', 'store'),
    jsonb_build_object('changed_fields', (select coalesce(jsonb_agg(key), '[]') from jsonb_each(coalesce(to_jsonb(NEW),'{}')) where value is distinct from to_jsonb(OLD)->key)));
  return coalesce(NEW, OLD);
end $$;
create trigger products_audit after insert or update or delete on public.products for each row execute function public.audit_store_change();
create trigger orders_audit after update on public.orders for each row execute function public.audit_store_change();
create trigger returns_audit after insert or update on public.return_requests for each row execute function public.audit_store_change();
create trigger settings_audit after update on public.store_settings for each row execute function public.audit_store_change();

create table if not exists public.order_email_outbox (
  id bigint generated always as identity primary key, order_id text not null references orders(id),
  kind text not null check (kind in ('customer','admin')), attempts integer not null default 0,
  claimed_at timestamptz, sent_at timestamptz, last_error text, email_payload jsonb,
  created_at timestamptz not null default now(), unique(order_id,kind)
);
alter table public.order_email_outbox enable row level security;
create or replace function public.claim_order_emails(target_order text default null)
returns setof order_email_outbox language sql security definer set search_path = public as $$
  update order_email_outbox set claimed_at=now(),attempts=attempts+1 where id in (
    select id from order_email_outbox where sent_at is null
    and (claimed_at is null or claimed_at < now()-interval '10 minutes')
    and (target_order is null or order_id=target_order)
    order by created_at limit 20 for update skip locked
  ) returning *;
$$;
revoke all on function public.claim_order_emails(text) from public,anon,authenticated;
grant execute on function public.claim_order_emails(text) to service_role;

-- A paid order is never discarded because stock ran out. Flag shortages for
-- fulfillment and keep nonnegative stock; all updates commit exactly once.
create or replace function public.record_paid_order(payload jsonb, coupon text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare line record; p products%rowtype; v jsonb; next_variants jsonb; shortage boolean := false; inserted_id text;
begin
  insert into orders(id,tracking_id,customer_name,customer_email,customer_phone,shipping_address,status,currency,payment_gateway,payment_reference,items,subtotal,shipping_cost,tax,discount_applied,total_amount)
  values(payload->>'id',payload->>'tracking_id',payload->>'customer_name',lower(trim(payload->>'customer_email')),payload->>'customer_phone',payload->'shipping_address','unshipped',payload->>'currency',payload->>'payment_gateway',payload->>'payment_reference',payload->'items',(payload->>'subtotal')::numeric,(payload->>'shipping_cost')::numeric,(payload->>'tax')::numeric,(payload->>'discount_applied')::numeric,(payload->>'total_amount')::numeric)
  on conflict (payment_reference) do nothing returning id into inserted_id;
  if inserted_id is null then return false; end if;
  -- Stable lock ordering prevents deadlocks when carts contain the same items.
  for line in select x->>'product_id' as id, sum((x->>'quantity')::integer)::integer as qty from jsonb_array_elements(payload->'items') x group by 1 order by 1 loop
    if line.qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into p from products where id = line.id for update;
    if not found then shortage := true; continue; end if;
    shortage := shortage or p.stock_qty < line.qty;
    next_variants := '[]';
    for v in select value from jsonb_array_elements(p.variants) loop
      declare used integer;
      begin
        select coalesce(sum((x->>'quantity')::integer),0) into used from jsonb_array_elements(payload->'items') x where x->>'product_id'=line.id and x->>'size'=v->>'size' and x->>'color'=v->>'color';
        shortage := shortage or (v->>'stock')::integer < used;
        next_variants := next_variants || jsonb_build_array(jsonb_set(v,'{stock}',to_jsonb(greatest(0,(v->>'stock')::integer-used))));
      end;
    end loop;
    update products set stock_qty=greatest(0,stock_qty-line.qty), variants=next_variants where id=line.id;
  end loop;
  if shortage then update orders set fulfillment_issue='Stock shortage after payment: review fulfillment or arrange a refund.' where id=inserted_id; end if;
  if coupon is not null then update signups set coupon_redeemed_at=now() where coupon_code=upper(trim(coupon)) and coupon_redeemed_at is null; end if;
  insert into order_email_outbox(order_id,kind) values(inserted_id,'customer'),(inserted_id,'admin');
  return true;
end $$;
revoke all on function public.record_paid_order(jsonb,text) from public, anon, authenticated;
grant execute on function public.record_paid_order(jsonb,text) to service_role;
create unique index if not exists unique_refund_reference on return_requests(refund_reference) where refund_reference is not null;
create or replace function public.update_return_request(request_id uuid, next_status text, new_notes text, amount numeric, reference text)
returns void language plpgsql security definer set search_path = public as $$
declare r return_requests%rowtype; o orders%rowtype;
begin
  select * into r from return_requests where id=request_id for update;
  if not found then raise exception 'Return not found'; end if;
  if r.status='refunded' then
    if next_status='refunded' and r.refund_amount=amount and r.refund_reference=reference then return; end if;
    raise exception 'Completed refund cannot be changed';
  end if;
  if next_status='refunded' then
    select * into o from orders where id=r.order_id for update;
    if amount <= 0 or amount <> round(amount,2) or amount > o.total_amount-o.refunded_amount or coalesce(length(trim(reference)),0)=0 then raise exception 'Invalid refund'; end if;
    update orders set refunded_amount=refunded_amount+amount where id=r.order_id;
  end if;
  update return_requests set status=next_status, notes=new_notes, refund_amount=amount, refund_reference=reference, updated_at=now() where id=request_id;
end $$;
revoke all on function public.update_return_request(uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.update_return_request(uuid,text,text,numeric,text) to service_role;
commit;
