// One-time (idempotent) Stripe setup for Punched.
// Run:  STRIPE_SECRET_KEY=sk_xxx node scripts/stripe-setup.mjs
//
// Creates (or reuses) the Starter + Growth recurring prices and a webhook
// endpoint pointing at prod, then prints the env values to paste into Vercel
// + .env.local. Safe to re-run: prices are keyed by lookup_key and the webhook
// is matched by URL.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
const stripe = new Stripe(key);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.punched.me";
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;

const PLANS = [
  { name: "Punched Starter", lookup: "punched_starter_monthly", amount: 1999 },
  { name: "Punched Growth", lookup: "punched_growth_monthly", amount: 5500 },
];

const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

async function ensurePrice({ name, lookup, amount }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  if (existing.data.length) {
    return existing.data[0];
  }
  const product = await stripe.products.create({ name });
  return stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: lookup,
  });
}

async function ensureWebhook() {
  const all = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = all.data.find((w) => w.url === WEBHOOK_URL);
  if (match) {
    // Secret is only returned at creation time; recreate to get a fresh secret.
    await stripe.webhookEndpoints.del(match.id);
  }
  return stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: "Punched plan activation + billing status",
  });
}

const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
console.log(`\n=== Stripe setup (${mode} mode) ===\n`);

const starter = await ensurePrice(PLANS[0]);
const growth = await ensurePrice(PLANS[1]);
console.log(`Starter price: ${starter.id} ($${(starter.unit_amount / 100).toFixed(2)}/mo)`);
console.log(`Growth  price: ${growth.id} ($${(growth.unit_amount / 100).toFixed(2)}/mo)`);

const webhook = await ensureWebhook();
console.log(`Webhook:       ${webhook.url}`);

console.log(`\n--- Paste these into Vercel (Production+Preview) + .env.local ---\n`);
console.log(`STRIPE_SECRET_KEY=${key}`);
console.log(`STRIPE_PRICE_STARTER=${starter.id}`);
console.log(`STRIPE_PRICE_GROWTH=${growth.id}`);
console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
console.log("");
