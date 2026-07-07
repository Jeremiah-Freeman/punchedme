-- The Punch Bank (Wave 2).
-- Turns the single fixed reward into a small "reward menu" of 2–3 rungs, and gives
-- redemptions a real record + a timed staff ticket. Balances never reset: a redeem
-- SUBTRACTS the rung cost from loyalty_accounts.current_punches and keeps the remainder
-- banked (the subtract-model already lives in current_punches — we just let a customer
-- spend at any unlocked rung instead of only at punches_required).
--
-- Backwards compatible: existing programs keep working off loyalty_programs.reward_name /
-- punches_required. A program with zero rungs behaves exactly as before (one implicit rung
-- at punches_required). The app treats reward_rungs as the source of truth when it has rows.

-- ── REWARD RUNGS ───────────────────────────────────────────────────────────
-- The owner-configured menu. Owner words only: "what can your regulars earn?"
-- cost = punches required for this rung. Enforced non-decreasing value-per-punch
-- (cost only ever climbs up the ladder) at the app layer AND with a per-program
-- uniqueness guard on cost so two rungs can't collide.
create table reward_rungs (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references loyalty_programs(id) on delete cascade,
  cost        int  not null check (cost > 0),
  reward_name text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (program_id, cost)
);

create index reward_rungs_program_idx on reward_rungs(program_id);

create trigger reward_rungs_updated_at before update on reward_rungs
  for each row execute procedure update_updated_at_column();

-- ── REWARD REDEMPTIONS ─────────────────────────────────────────────────────
-- One row per cash-out. Backs the full-screen timed staff ticket and the audit trail.
-- status: pending  → customer chose CASH OUT, ticket is live for staff to honor
--         redeemed → staff confirmed / ticket ran its course (terminal)
--         voided   → cancelled before honor (terminal)
-- ticket_token is the short code staff reads on the screen; expires_at drives the timer.
-- balance_after snapshots the banked remainder so the ticket can say "4 still in the bank".
create type redemption_status as enum ('pending', 'redeemed', 'voided');

create table reward_redemptions (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  customer_id    uuid not null references customers(id) on delete cascade,
  program_id     uuid not null references loyalty_programs(id) on delete cascade,
  account_id     uuid not null references loyalty_accounts(id) on delete cascade,
  rung_id        uuid references reward_rungs(id) on delete set null,
  reward_name    text not null,
  cost           int  not null check (cost > 0),
  balance_after  int  not null default 0,
  status         redemption_status not null default 'pending',
  ticket_token   text not null unique default encode(gen_random_bytes(6), 'hex'),
  expires_at     timestamptz not null default (now() + interval '5 minutes'),
  redeemed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index reward_redemptions_business_idx on reward_redemptions(business_id);
create index reward_redemptions_customer_idx on reward_redemptions(customer_id);
create index reward_redemptions_ticket_idx   on reward_redemptions(ticket_token);
create index reward_redemptions_status_idx   on reward_redemptions(business_id, status);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Mirror the existing pattern: owner reads/manages via parent business; the service
-- role (used by scan/redeem API routes) bypasses RLS for writes.

alter table reward_rungs enable row level security;
create policy "Owner manages reward rungs" on reward_rungs
  for all using (
    exists (
      select 1 from loyalty_programs p
      join businesses b on b.id = p.business_id
      where p.id = reward_rungs.program_id
      and b.owner_user_id = auth.uid()
    )
  );

alter table reward_redemptions enable row level security;
create policy "Owner reads reward redemptions" on reward_redemptions
  for select using (
    exists (
      select 1 from businesses b
      where b.id = reward_redemptions.business_id
      and b.owner_user_id = auth.uid()
    )
  );

-- ── SEED: give every existing program its current reward as a single rung ───
-- So live shops immediately have a one-rung "menu" that matches today's behavior;
-- owners can then add a small treat / big prize around it.
insert into reward_rungs (program_id, cost, reward_name, sort_order)
select id, punches_required, reward_name, 0
from loyalty_programs
on conflict (program_id, cost) do nothing;
