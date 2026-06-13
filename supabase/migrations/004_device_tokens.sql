-- ============================================================
-- DEVICE TOKENS
-- ------------------------------------------------------------
-- A revocable, scan-only credential for unattended kiosks (e.g. the
-- Raspberry Pi scanner). A device token resolves to exactly one business and
-- can ONLY add punches / redeem rewards via /scan/<token> — it carries no
-- dashboard session, so a lost or stolen kiosk can be killed by revoking the
-- token instead of changing the owner's password.
-- ============================================================
create table device_tokens (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  label        text not null default 'Kiosk',
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index device_tokens_business_idx on device_tokens(business_id);
create index device_tokens_token_idx on device_tokens(token);

-- Owner manages their own device tokens; the kiosk endpoints use the service
-- role (admin client) and so bypass RLS, the same way customer scans do.
alter table device_tokens enable row level security;
create policy "Owner manages device tokens" on device_tokens
  for all using (
    exists (
      select 1 from businesses b
      where b.id = device_tokens.business_id
      and b.owner_user_id = auth.uid()
    )
  );
