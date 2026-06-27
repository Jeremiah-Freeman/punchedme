-- Pricing tiers, plan state machine, and physical-display selection/fulfillment.
-- Adds plan/billing/contact/display columns to businesses + a display_orders table.
-- Member count is DERIVED from customers (count per business) — see views/queries —
-- so we don't add a column that can drift; we cache nothing here.

-- ── businesses: contact + category ─────────────────────────────────────────
alter table businesses add column if not exists category text;
alter table businesses add column if not exists contact_name text;
alter table businesses add column if not exists contact_email text;
alter table businesses add column if not exists contact_phone text;
alter table businesses add column if not exists website text;

-- ── businesses: display selection / fulfillment ────────────────────────────
-- selected_display_type: sticker | acrylic | bamboo | black | dynamic
alter table businesses add column if not exists selected_display_type text default 'sticker';
-- display_status: selected | pending_payment | preparing | shipped | delivered
alter table businesses add column if not exists display_status text default 'selected';

-- ── businesses: plan + billing ─────────────────────────────────────────────
-- plan_type: free | starter | growth
alter table businesses add column if not exists plan_type text not null default 'free';
-- plan_status: free_active | free_near_limit | free_limit_reached_no_payment | starter_active | growth_required
alter table businesses add column if not exists plan_status text not null default 'free_active';
-- payment_status: none | active | past_due
alter table businesses add column if not exists payment_status text not null default 'none';
alter table businesses add column if not exists stripe_customer_id text;
alter table businesses add column if not exists stripe_subscription_id text;
-- when true, auto-activate Starter + ship display the moment they hit 50 members
alter table businesses add column if not exists auto_activate_on_milestone boolean not null default false;

-- ── display_orders: physical kit fulfillment ───────────────────────────────
create table if not exists public.display_orders (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  display_type    text not null,
  -- selected | pending_payment | preparing | shipped | delivered
  status          text not null default 'selected',
  shipping_name   text,
  shipping_address text,
  tracking_number text,
  created_at      timestamptz not null default now(),
  shipped_at      timestamptz
);

create index if not exists display_orders_business_id_idx
  on public.display_orders(business_id);

grant all on public.display_orders to authenticated, service_role;

-- Plan member caps (kept in code too, but documented here):
--   free   = 50
--   starter= 200
--   growth = 1000
