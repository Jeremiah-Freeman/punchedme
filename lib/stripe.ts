import Stripe from "stripe";

// Lazily-constructed server Stripe client. Throws only when actually used
// without a key, so builds/imports don't fail when env is absent.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// Maps a plan name to its configured recurring price id.
export function priceIdForPlan(plan: string): string | undefined {
  if (plan === "growth") return process.env.STRIPE_PRICE_GROWTH;
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER;
  return undefined;
}

// Member caps per plan (kept in sync with migration 007 + dashboard).
export const PLAN_CAPS: Record<string, number> = {
  free: 50,
  starter: 200,
  growth: 1000,
};
