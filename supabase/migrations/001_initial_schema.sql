-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  logo_url     text,
  brand_color  text not null default '#6366f1',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index businesses_slug_idx on businesses(slug);
create index businesses_owner_idx on businesses(owner_user_id);

-- ============================================================
-- LOYALTY PROGRAMS
-- ============================================================
create table loyalty_programs (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references businesses(id) on delete cascade,
  name                  text not null,
  reward_name           text not null,
  punches_required      int not null default 10 check (punches_required > 0),
  punch_cooldown_minutes int not null default 240,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index loyalty_programs_business_idx on loyalty_programs(business_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table customers (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  first_name       text not null,
  phone_number     text not null,
  normalized_phone text not null,
  public_token     text not null unique default encode(gen_random_bytes(32), 'hex'),
  wallet_serial    text not null unique default gen_random_uuid()::text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (business_id, normalized_phone)
);

create index customers_business_idx on customers(business_id);
create index customers_token_idx on customers(public_token);
create index customers_phone_idx on customers(business_id, normalized_phone);

-- ============================================================
-- LOYALTY ACCOUNTS
-- ============================================================
create table loyalty_accounts (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references customers(id) on delete cascade,
  program_id       uuid not null references loyalty_programs(id) on delete cascade,
  current_punches  int not null default 0 check (current_punches >= 0),
  lifetime_punches int not null default 0,
  rewards_earned   int not null default 0,
  rewards_redeemed int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (customer_id, program_id)
);

create index loyalty_accounts_customer_idx on loyalty_accounts(customer_id);
create index loyalty_accounts_program_idx on loyalty_accounts(program_id);

-- ============================================================
-- SCAN EVENTS
-- ============================================================
create type scan_event_type as enum (
  'punch_added',
  'reward_earned',
  'reward_redeemed',
  'manual_adjustment',
  'blocked',
  'undo'
);

create table scan_events (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  program_id    uuid not null references loyalty_programs(id) on delete cascade,
  staff_user_id uuid references auth.users(id),
  event_type    scan_event_type not null,
  punches_delta int not null default 0,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index scan_events_business_idx on scan_events(business_id);
create index scan_events_customer_idx on scan_events(customer_id);
create index scan_events_created_idx on scan_events(created_at desc);

-- ============================================================
-- STAFF USERS
-- ============================================================
create type staff_role as enum ('owner', 'manager', 'cashier');

create table staff_users (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid references auth.users(id),
  name        text not null,
  pin_hash    text,
  role        staff_role not null default 'cashier',
  created_at  timestamptz not null default now()
);

create index staff_users_business_idx on staff_users(business_id);

-- ============================================================
-- WALLET PASSES
-- ============================================================
create type wallet_type as enum ('apple', 'google', 'fallback');

create table wallet_passes (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references customers(id) on delete cascade,
  wallet_type      wallet_type not null,
  pass_identifier  text,
  serial_number    text,
  google_object_id text,
  last_updated_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index wallet_passes_customer_idx on wallet_passes(customer_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on businesses
  for each row execute procedure update_updated_at_column();
create trigger loyalty_programs_updated_at before update on loyalty_programs
  for each row execute procedure update_updated_at_column();
create trigger customers_updated_at before update on customers
  for each row execute procedure update_updated_at_column();
create trigger loyalty_accounts_updated_at before update on loyalty_accounts
  for each row execute procedure update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Businesses: owner can do everything
alter table businesses enable row level security;
create policy "Owner manages own business" on businesses
  for all using (auth.uid() = owner_user_id);

-- Loyalty programs: owner of parent business
alter table loyalty_programs enable row level security;
create policy "Owner manages loyalty programs" on loyalty_programs
  for all using (
    exists (
      select 1 from businesses b
      where b.id = loyalty_programs.business_id
      and b.owner_user_id = auth.uid()
    )
  );

-- Customers: owner of parent business, or service role
alter table customers enable row level security;
create policy "Owner reads customers" on customers
  for select using (
    exists (
      select 1 from businesses b
      where b.id = customers.business_id
      and b.owner_user_id = auth.uid()
    )
  );
-- Service role bypasses RLS for inserts (customer signup uses service key)

-- Loyalty accounts: owner or service role
alter table loyalty_accounts enable row level security;
create policy "Owner reads loyalty accounts" on loyalty_accounts
  for select using (
    exists (
      select 1 from customers c
      join businesses b on b.id = c.business_id
      where c.id = loyalty_accounts.customer_id
      and b.owner_user_id = auth.uid()
    )
  );

-- Scan events: owner reads all
alter table scan_events enable row level security;
create policy "Owner reads scan events" on scan_events
  for select using (
    exists (
      select 1 from businesses b
      where b.id = scan_events.business_id
      and b.owner_user_id = auth.uid()
    )
  );

-- Wallet passes: service role only (no direct user access needed)
alter table wallet_passes enable row level security;

-- Staff users: owner manages
alter table staff_users enable row level security;
create policy "Owner manages staff" on staff_users
  for all using (
    exists (
      select 1 from businesses b
      where b.id = staff_users.business_id
      and b.owner_user_id = auth.uid()
    )
  );
