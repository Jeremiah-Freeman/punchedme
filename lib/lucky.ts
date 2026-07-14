// Lucky Punch — pure logic + Moe-voice copy for the "some scans land double" bolt-on.
// Kept dependency-free (like lib/punch-bank) so the checkin API and the client page
// agree exactly. It only ever gives: a miss is a normal punch, never a penalty.

// Decide whether this scan is a double.
//   odds     — the owner's setting: 0 = off, else N ≈ "1-in-N is a double".
//   since    — punches since this account's last double (the pity counter).
//   rand     — a [0,1) random (injected so this stays pure + testable).
// Pity rule: once we've gone `odds` punches without a double, the next one is
// guaranteed — so nobody sits on a cold streak forever.
export function rollLucky(odds: number, since: number, rand: number): boolean {
  if (!odds || odds < 2) return false;
  if (since + 1 >= odds) return true; // pity guarantee
  return rand < 1 / odds;
}

// The delta a scan adds to the balance.
export function punchDelta(lucky: boolean): number {
  return lucky ? 2 : 1;
}

// Next pity-counter value after a scan.
export function nextSinceDouble(lucky: boolean, since: number): number {
  return lucky ? 0 : since + 1;
}

// Owner-facing, plain-English odds + rough cost, shown when they set it up. No
// codenames, no gambling words — just what it does and what it roughly costs.
export function luckyOwnerNote(odds: number): string {
  if (!odds || odds < 2) return "Off — every scan is a normal single punch.";
  const pct = Math.round((100 / odds));
  return `About 1 in ${odds} scans lands a double punch (~${pct}% of visits). It only ever gives extra — a miss is just a normal punch. Costs you roughly one extra reward per ${odds} visits.`;
}

// Customer-facing odds line — printed on screens so the game is never hidden.
export function luckyOddsLine(odds: number): string {
  if (!odds || odds < 2) return "";
  return `Every scan has a 1-in-${odds} shot at a double punch.`;
}

// The celebration headline when a double lands.
export const LUCKY_HIT_TITLE = "Double punch!";
export const LUCKY_HIT_SUB = "Lucky scan — that one counted twice. On the house.";
