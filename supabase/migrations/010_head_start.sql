-- Head Start (the endowed-progress effect).
--
-- New members begin a few punches IN, not at a cold zero — and after a redemption
-- they never get dumped back to zero either; the balance re-seeds to the head start.
-- Nunes & Drèze (2006) car-wash study: a card pre-stamped with 2 (of a higher goal)
-- was completed by ~34% of customers vs ~19% for the same real effort from scratch.
-- People finish a journey they already feel underway on.
--
-- Per-program, so an owner can dial it (or set 0), but it defaults ON at 3.
alter table loyalty_programs
  add column if not exists head_start int not null default 3
  check (head_start >= 0);
