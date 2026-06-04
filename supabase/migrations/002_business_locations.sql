-- Multi-location support: one business, many store addresses.
-- Wallet passes + GPS check-in use all of these.

create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text,
  address text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists business_locations_business_id_idx
  on public.business_locations(business_id);

grant all on public.business_locations to authenticated, service_role;

-- Seed: copy each business's onboarding address into its first location row
insert into public.business_locations (business_id, address, latitude, longitude)
select b.id, b.address, b.latitude, b.longitude
from public.businesses b
where b.address is not null
  and not exists (
    select 1 from public.business_locations l where l.business_id = b.id
  );
