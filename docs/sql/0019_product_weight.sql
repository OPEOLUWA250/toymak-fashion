-- Store the weight of one product in kilograms for Royal Mail parcels.
-- Existing products default to 0.5 kg until an admin updates them.
alter table public.products
  add column if not exists weight_kg numeric(8,3) not null default 0.5;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_weight_kg_positive'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_weight_kg_positive
      check (weight_kg > 0 and weight_kg <= 70);
  end if;
end $$;
