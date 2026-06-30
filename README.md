# Punched.me

**Digital punch cards without the stupid card.** No app, no login for customers — a shop puts one QR at the counter; a customer scans it, joins with first name + phone, and their loyalty card lands in Apple/Google Wallet. On later visits they self-scan the same QR to earn a punch; staff redeem rewards at checkout.

**Live:** https://www.punched.me (apex `punched.me` 308-redirects to `www`).

> This README is the single source of truth for how the project is set up and how it works. Keep it current.

---

## Status

| Area | State |
|---|---|
| Web app | **Live** in production (Vercel, auto-deploys from `main`) |
| Apple Wallet | **Live** for all customers (signed `.pkpass`) |
| Google Wallet | Working in **demo** mode (testers); publishing review pending a Google payments profile |
| Stripe billing | **Live** — real cards via express checkout (Apple Pay / Google Pay / Link); Starter $19.99/mo, Growth $55/mo |
| Tests + CI | Playwright suite + GitHub Actions gate (build/typecheck → prod e2e) |

---

## Stack

- **Next.js 14** (App Router) · **React 18** · **Tailwind**
- **Supabase** (Postgres + Auth; project ref `wfqptijzrvohgvdmvdpb`)
- **Stripe** (subscriptions + customer portal + webhooks)
- **Apple/Google Wallet** pass generation (`archiver`, `node-forge`)
- **Playwright** e2e tests
- Typography: Raleway, with every digit auto-rendered in Helvetica via a global `@font-face` unicode-range (oldstyle figures bounce otherwise).

---

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

The dev server reads `.env.local` and talks to the real Supabase project.

### Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; bypasses RLS — never client-side
NEXT_PUBLIC_APP_URL=              # http://localhost:3000 locally, https://www.punched.me in prod

# Apple Wallet (optional — falls back to a web pass if absent)
APPLE_TEAM_ID=
APPLE_PASS_TYPE_ID=
APPLE_PASS_CERTIFICATE=           # base64 of the .p12
APPLE_PASS_CERTIFICATE_PASSWORD=
APPLE_WWDR_CERTIFICATE=           # base64 of the WWDR PEM

# Google Wallet (optional)
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_KEY=       # base64 of the service-account JSON

# Stripe (test keys locally, live keys in Vercel production)
STRIPE_SECRET_KEY=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_GROWTH=
STRIPE_WEBHOOK_SECRET=
```

Production env lives in Vercel (project `punchedme`, team `jay-freeman-s-projects`). `.env.local` and Vercel **Preview** use Stripe **test** keys; Vercel **Production** uses **live** keys.

### Database migrations

Run by hand in the Supabase SQL Editor, in order. All of these are applied in prod:

| # | File | What it adds |
|---|---|---|
| 001 | `initial_schema` | businesses, customers, programs, accounts, scan_events, wallet_passes + RLS |
| 002 | `business_locations` | multi-location support |
| 003 | `logo_storage` | business logo storage |
| 004 | `device_tokens` | scan-only kiosk tokens (`/api/scans/kiosk`) |
| 005 | `sticker_codes` | physical `/c/<code>` sticker routing |
| 006 | `business_timezone` | per-business timezone (overnight-punch guard) |
| 007 | `pricing_and_display` | plan/billing/contact/display columns + `display_orders` |
| 008 | `rate_limits` | `rate_limit_hits` table for the rate limiter (RLS on, service-role only) |

To regenerate Stripe products/prices + webhook for a key: `STRIPE_SECRET_KEY=sk_... node scripts/stripe-setup.mjs`.

---

## Plans

| Plan | Price | Reward-member cap |
|---|---|---|
| Free | $0 | 50 |
| Starter | $19.99/mo | 200 |
| Growth | $55/mo | 1,000 |

New joins soft-pause at the cap; existing members always keep earning. Caps live in `lib/stripe.ts` (`PLAN_CAPS`) and migration `007`.

---

## The three flows

**Owner:** sign up → confirm email → onboarding (business → program → display → plan) → dashboard. Manage plan/payment under **Dashboard → Plan & Billing** (Stripe customer portal: update card, invoices, cancel).

**Customer:** scan the counter QR → `/b/<slug>/join` → first name + phone → card to Apple/Google Wallet → later self-scans the same QR (`/api/scans/checkin`, geofenced + cooldown + overnight guard) to earn punches.

**Cashier / kiosk:** **Dashboard → Scan Mode** (authenticated owner), or an unattended Raspberry Pi kiosk via a revocable scan-only device token (`/scan/<token>` → `/api/scans/kiosk`). See `kiosk/README.md`.

---

## Architecture

```
app/
  page.tsx                     Landing (+ HeroSignupForm)
  pricing/                     Public pricing (CTAs route logged-in shops to billing)
  auth/                        login · signup · confirm-email · reset/forgot · callback
  onboarding/                  Wizard (how→business→program→display→plan) + success
  b/[businessSlug]/join/       Customer join + self-scan (public)
  c/[code]/                    Physical sticker router (claimed→join, unclaimed→/sticker/inactive)
  sticker/inactive/            "Card not active yet" interstitial
  pass/[token]/                Fallback web pass (public)
  display/[slug]/              Counter display screen
  scan/[token]/                Unattended kiosk (device-token scoped)
  dashboard/                   overview · scan · customers · program · assets · locations · billing
  api/
    business/   create · me · program · locations · logo · report · public · device-tokens · onboarding-plan
    customers/  signup · list · lookup · adjust
    scans/      process · checkin · kiosk · undo
    rewards/    redeem
    stripe/     checkout · portal · webhook
    wallet/     apple/[token] · google/[token]
    feedback/   custom-request
lib/
  supabase/    client · server · admin (service-role)
  wallet/      apple · google
  stripe.ts · rate-limit.ts · scan.ts · device-token.ts · locations.ts · types.ts · utils.ts
middleware.ts                  Auth protection + redirects
supabase/migrations/           001–008
tests/                         Playwright specs
scripts/stripe-setup.mjs       Idempotent Stripe products/prices/webhook setup
```

---

## Security model

- **Pages:** `middleware.ts` redirects `/dashboard` and `/onboarding` to login; dashboard pages also re-check `getUser()` and scope every query by `owner_user_id` (defense in depth).
- **Owner-only API routes** verify the caller owns the resource: `scans/process`, `rewards/redeem`, `customers/adjust|list|lookup`, `scans/undo`, `business/*`, `stripe/checkout|portal`. (The first two were hardened on 2026-06-29 — they were previously open.)
- **Public endpoints** are rate-limited (`lib/rate-limit.ts`, backed by `rate_limit_hits`): `customers/signup` (20/min/IP), `scans/kiosk` lookup (20/min/device), `feedback` (5/10min/IP). The limiter fails open.
- **Self-scan fraud controls:** 100 m geofence (required when a shop has a location set), once-per-cooldown, overnight block. Customer QR tokens are 64-char hex — never a phone number or DB id.
- **Stripe webhook** verifies the signature before processing; the service-role key is server-only.

---

## Testing & CI

```bash
npm run typecheck                                   # tsc --noEmit
npm run build                                       # next build
npm run test:e2e                                    # Playwright vs localhost (auto-starts dev server)
npx playwright test --config playwright.config.ci.ts  # Playwright vs production (read-only)
```

Suites in `tests/`: `smoke`, `landing`, `join`, `mobile`, plus `link-integrity` (crawls + guards every route against 404s), `api-security` (asserts protected endpoints reject unauthenticated callers), `customer-journey` (join form; signup POST intercepted so tests never write to prod), and `routes-extra`. All are read-only and unauthenticated — safe to run against prod.

**CI** (`.github/workflows/ci.yml`) runs on every push to `main` and on PRs: `build-and-typecheck` (with placeholder env), then `e2e-prod-smoke` against production. To make it a **blocking** gate, enable branch protection on `main` requiring the `Build & typecheck` (and optionally `E2E prod smoke`) checks.

---

## Deployment

`main` auto-deploys to Vercel. Env changes go through the Vercel dashboard (or `vercel env`). `next build` failing blocks the deploy. After changing Stripe/Wallet env, redeploy (a no-op commit is enough).
