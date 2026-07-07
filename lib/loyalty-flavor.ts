// Customer-facing "honest points" copy + math. Shared by the checkin API, the
// post-scan join page, the web pass card, and the wallet passes so the voice and
// the numbers never drift between surfaces.
//
// NOTE: keep every string in Moe's voice — edgy, warm, never mean to the
// customer, and never leak an internal codename.

// A punch is a visit. Moe Money is the same number with a couple zeros stapled on
// because a big number feels good and we're honest about why.
export const MOE_MONEY_PER_PUNCH = 100;

export function moeMoney(lifetimePunches: number): number {
  return Math.max(0, lifetimePunches) * MOE_MONEY_PER_PUNCH;
}

// Ranks earned by lifetime visits. They only ever go up — we don't demote people.
export interface Rank {
  title: string;
  min: number;
}

// Ordered high → low so the first match wins.
const RANKS: Rank[] = [
  { title: "Legend", min: 100 },
  { title: "Furniture", min: 50 },
  { title: "Fixture", min: 25 },
  { title: "Regular", min: 10 },
  { title: "Newcomer", min: 1 },
];

export function rankFor(lifetimePunches: number): string {
  const n = Math.max(0, lifetimePunches);
  return (RANKS.find((r) => n >= r.min) ?? RANKS[RANKS.length - 1]).title;
}

// Did this visit cross a rank threshold? (used to fire the bigger celebration)
export function rankJustEarned(lifetimePunches: number): string | null {
  return RANKS.some((r) => r.min === lifetimePunches) ? rankFor(lifetimePunches) : null;
}

// The line Moe drops when you level up. Keyed by rank so each one has its own bit.
export function rankUpLine(rank: string): string {
  switch (rank) {
    case "Regular":
      return "You're a Regular now. Officially. We'll remember your face.";
    case "Fixture":
      return "You are now a Fixture. You basically live here.";
    case "Furniture":
      return "You are now Furniture. This means nothing and everything.";
    case "Legend":
      return "Legend status. The shop is legally required to remember your order now.*";
    default:
      return "Welcome in. That's punch number one.";
  }
}

// Rotating honesty/roast footer for the post-scan screen. Pick deterministically
// off the visit count so a given visit always shows the same line. Moe voice,
// no unverifiable stats, no codenames.
const FOOTER_LINES: string[] = [
  "Your punches never expire. We're not cowards.",
  "One visit, one punch. The rate never changes. Ever.",
  "No blackout dates. We don't even know what those are.",
  "We make money when the shop keeps you happy. Not when you forget.",
  "No app to download. No password to forget. You're welcome.",
  "This card can't be lost, coffee-stained, or eaten by your dog.",
  "Somewhere a points program just expired someone's balance. Not here.",
];

export function footerLine(visitCount: number): string {
  const i = Math.abs(Math.trunc(visitCount)) % FOOTER_LINES.length;
  return FOOTER_LINES[i];
}

// The manifesto printed on the back of the wallet pass. Keep lines short — pass
// back-fields have length limits on both platforms.
export const PASS_MANIFESTO: string[] = [
  "Your punches never expire. We're not cowards.",
  "1 visit = 1 punch. The rate never changes.",
  "No blackout dates. We don't know what those are.",
  "We make money when the shop keeps you happy — not when you forget your points.",
];

// The Moe Money confession, for wherever we show the big number.
export const MOE_MONEY_RATE_LINE =
  "1 visit = 100 Moe Money. Forever. This rate has never changed and never will.";
