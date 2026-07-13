-- Lucky Punch (the variance bolt-on).
--
-- Some self-scans land DOUBLE. The owner picks the odds (1-in-N) or turns it off.
-- A pity counter guarantees at least one double per cycle, so the run never feels
-- rigged against the customer. Self-scan = the customer pulls the lever themselves.
-- Iron rule from the spec: it only ever GIVES, never conditions — a miss is still a
-- normal punch, never a penalty.
--
-- lucky_odds: 0 = off; otherwise N means "≈1-in-N scans is a double".
alter table loyalty_programs
  add column if not exists lucky_odds int not null default 0
  check (lucky_odds = 0 or lucky_odds >= 2);

-- Per-account pity counter: how many punches since this account's last double.
-- When it reaches lucky_odds we force a double and reset it to 0.
alter table loyalty_accounts
  add column if not exists punches_since_double int not null default 0;
