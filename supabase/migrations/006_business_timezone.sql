-- ============================================================
-- BUSINESS TIMEZONE — for the open-hours self-scan guard
-- ============================================================
-- The customer self-scan check uses this to block overnight punches in the
-- business's local time. Defaults to Pacific (our launch market is Portland);
-- a real per-business hours UI can set it precisely later.
alter table businesses
  add column if not exists timezone text not null default 'America/Los_Angeles';
