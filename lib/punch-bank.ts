// The Punch Bank — pure logic + Moe-voice copy for the banked-balance reward model.
// Balance never resets. The owner sets a tiny "reward menu" of 1–3 rungs; a customer
// can cash out any unlocked rung at any time, or let it ride toward a bigger one.
// Kept dependency-free so the checkin API, the claim API, and the client page all
// compute the exact same thing. No codenames in any user-visible string.

// ── Shapes ──────────────────────────────────────────────────────────────────

// A configured reward rung (camelCase, app-side).
export interface Rung {
  id: string;
  cost: number;
  rewardName: string;
}

// A rung with its unlocked state for the current balance.
export interface BankRung extends Rung {
  unlocked: boolean;
}

// The lowest not-yet-affordable rung, plus how many punches to go.
export interface NextRung extends Rung {
  toNext: number;
}

export interface BankState {
  balance: number;
  rungs: BankRung[]; // sorted by cost ascending, each flagged unlocked/locked
  available: boolean; // is any rung affordable right now?
  topUnlocked: BankRung | null; // highest-cost rung they can afford
  nextRung: NextRung | null; // lowest-cost rung they can't afford yet
}

// ── Core math ───────────────────────────────────────────────────────────────

export function sortRungs<T extends { cost: number }>(rungs: T[]): T[] {
  return [...rungs].sort((a, b) => a.cost - b.cost);
}

export function computeBank(balance: number, rungs: Rung[]): BankState {
  const withFlags: BankRung[] = sortRungs(rungs).map((r) => ({
    ...r,
    unlocked: balance >= r.cost,
  }));
  const unlocked = withFlags.filter((r) => r.unlocked);
  const nextLocked = withFlags.find((r) => !r.unlocked) ?? null;
  return {
    balance,
    rungs: withFlags,
    available: unlocked.length > 0,
    topUnlocked: unlocked.length ? unlocked[unlocked.length - 1] : null,
    nextRung: nextLocked
      ? { ...nextLocked, toNext: Math.max(0, nextLocked.cost - balance) }
      : null,
  };
}

// The highest rung crossed by going from `prev` (exclusive) to `next` (inclusive).
// Used to fire the "you just unlocked X" moment on the visit it happens.
export function crossedRung(prev: number, next: number, rungs: Rung[]): Rung | null {
  const crossed = sortRungs(rungs).filter((r) => r.cost > prev && r.cost <= next);
  return crossed.length ? crossed[crossed.length - 1] : null;
}

// ── Owner-menu validation ─────────────────────────────────────────────────────
// Iron rule from the spec: value per punch must never get worse as you climb, so
// costs must strictly increase up the ladder. We can't see dollar value, so cost
// order is the enforceable proxy. Owner-facing copy only — never a codename.

export interface RungInput {
  cost: number;
  rewardName: string;
}

export function validateRungs(rungs: RungInput[]): { ok: boolean; error?: string } {
  const cleaned = rungs.filter((r) => r.rewardName.trim() !== "" || r.cost);
  if (cleaned.length === 0) return { ok: false, error: "Add at least one reward." };
  if (cleaned.length > 3) return { ok: false, error: "Keep it to 3 rewards or fewer." };
  const sorted = [...cleaned].sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < sorted.length; i++) {
    if (!Number.isInteger(sorted[i].cost) || sorted[i].cost < 1) {
      return { ok: false, error: "Punch counts must be whole numbers of 1 or more." };
    }
    if (!sorted[i].rewardName.trim()) {
      return { ok: false, error: "Every reward needs a name." };
    }
    if (i > 0 && sorted[i].cost === sorted[i - 1].cost) {
      return { ok: false, error: "Two rewards can't need the same number of punches." };
    }
  }
  return { ok: true };
}

// ── Copy (Moe's voice) ────────────────────────────────────────────────────────

// The line that makes "let it ride" safe — the whole philosophy in three sentences.
export const RIDE_REASSURANCE =
  "Riding can't lose — your reward stays banked either way. This isn't Vegas. It's a bakery.";

export function cashOutLabel(r: { rewardName: string }): string {
  return `Cash out — ${r.rewardName}`;
}

export function letItRideLine(next: NextRung): string {
  const p = next.toNext === 1 ? "punch" : "punches";
  return `Let it ride — ${next.toNext} more ${p} for ${next.rewardName}.`;
}

export function unlockedLine(r: { rewardName: string }): string {
  return `You just unlocked ${r.rewardName}!`;
}

// Banked-balance sub-label for the progress card on an ordinary punch.
export function balanceLine(balance: number): string {
  return balance === 1 ? "1 punch banked" : `${balance} punches banked`;
}
