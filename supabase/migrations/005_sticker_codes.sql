-- ============================================================
-- STICKER CODES — the pre-printed /c/<code> sticker pool
-- ============================================================
-- Each physical envelope ships with one unique code (3 identical stickers).
-- First scan ever (unclaimed) → business onboarding, which binds the code to
-- that business. Every scan after → that business's customer join/punch flow.
create table sticker_codes (
  code        text primary key,
  business_id uuid references businesses(id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index sticker_codes_business_idx on sticker_codes(business_id);

alter table sticker_codes enable row level security;

-- Owners can read the codes bound to their own business. Claiming/lookup happens
-- via the service-role client in the router, which bypasses RLS.
create policy "Owner reads own sticker codes" on sticker_codes
  for select using (
    business_id is not null
    and exists (
      select 1 from businesses b
      where b.id = sticker_codes.business_id
      and b.owner_user_id = auth.uid()
    )
  );

-- Seed a test pool of ~50 unclaimed codes (6-char uppercase hex).
-- Production batches get generated the same way before each print run.
insert into sticker_codes (code)
select upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6))
from generate_series(1, 50)
on conflict (code) do nothing;
