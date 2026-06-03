# Punchless — Setup Guide

Digital punch cards without the stupid card.

## Quick Start

### 1. Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. Note your **Project URL** and **anon key** from Settings → API.
3. Also copy your **Service Role key** (keep this secret).

### 2. Run the database migration

In Supabase → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, and row-level security policies.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Demo Flow

### As the business owner:
1. Go to http://localhost:3000
2. Click **Get started free** → create an account
3. Create your business (e.g. "Test Coffee", pick a color)
4. Create your loyalty program:
   - Reward name: "Free Coffee"
   - Punches required: 10
   - Cooldown: 4 hours
5. You're in the dashboard. Go to **Assets** to see your signup QR.

### As a customer:
1. Open http://localhost:3000/b/[your-business-slug]/join
2. Enter name + phone number → Join
3. Tap "View My Card" to see your web pass with QR code

### As the cashier:
1. Go to **Scan Mode** in the dashboard (or /dashboard/scan)
2. Choose USB Scanner mode (or Camera mode if you have a webcam)
3. Scan the customer's QR code
4. See the result: "Punch added. Jay is at 1/10."
5. After 10 punches: "Reward available!" → tap Redeem

---

## Wallet Integration (Phase 2)

### Apple Wallet

Requires an Apple Developer account ($99/year).

1. Create a Pass Type ID in the Apple Developer portal.
2. Download the `.p12` certificate.
3. Download the Apple WWDR certificate.

```bash
# Convert .p12 to base64
base64 -i your-cert.p12 | tr -d '\n'

# Convert WWDR PEM to base64
base64 -i AppleWWDRCA.pem | tr -d '\n'
```

Add to `.env.local`:
```
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.yourcompany.punchless
APPLE_PASS_CERTIFICATE=<base64 .p12>
APPLE_PASS_CERTIFICATE_PASSWORD=your-password
APPLE_WWDR_CERTIFICATE=<base64 WWDR PEM>
```

### Google Wallet

1. Go to https://pay.google.com/business/console and create an issuer account.
2. Create a service account in Google Cloud Console with Wallet API access.
3. Download the service account JSON key.

```bash
base64 -i service-account-key.json | tr -d '\n'
```

Add to `.env.local`:
```
GOOGLE_WALLET_ISSUER_ID=your-issuer-id
GOOGLE_WALLET_CLASS_ID=your-issuer-id.punchless_loyalty
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=<base64 JSON key>
```

**Without these env vars**, the system automatically falls back to a web-based QR pass that works identically for cashier scanning.

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Set all environment variables in Vercel dashboard → Settings → Environment Variables.

Update `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://punchless.vercel.app`).

---

## Project Structure

```
punchless/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/
│   │   ├── login/                  # Business owner login
│   │   ├── signup/                 # Business owner signup
│   │   └── callback/               # Supabase auth callback
│   ├── onboarding/                 # Business + program setup wizard
│   ├── b/[businessSlug]/join/      # Customer sign-up page (public)
│   ├── pass/[token]/               # Fallback web pass (public)
│   ├── dashboard/
│   │   ├── page.tsx                # Overview + recent activity
│   │   ├── program/                # Edit loyalty program
│   │   ├── customers/              # Customer table + manual adjust
│   │   ├── scan/                   # Cashier scan mode (dark UI)
│   │   └── assets/                 # QR downloads + URLs
│   └── api/
│       ├── business/
│       │   ├── create/             # POST: create business
│       │   ├── me/                 # GET: current business + program
│       │   └── program/            # POST/PATCH: create/update program
│       ├── customers/
│       │   ├── signup/             # POST: customer join
│       │   ├── list/               # GET: all customers for dashboard
│       │   ├── lookup/             # GET: find customer by phone
│       │   └── adjust/             # POST: manual punch adjustment
│       ├── scans/
│       │   ├── process/            # POST: validate + add punch
│       │   └── undo/               # POST: undo last scan (2min window)
│       ├── rewards/
│       │   └── redeem/             # POST: redeem reward (subtract model)
│       └── wallet/
│           ├── apple/[token]/      # GET: .pkpass file
│           └── google/[token]/     # GET: Google Wallet save URL
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server/RSC client
│   │   └── admin.ts                # Service role client (bypasses RLS)
│   ├── wallet/
│   │   ├── apple.ts                # .pkpass generation
│   │   └── google.ts               # Google Wallet JWT generation
│   ├── types.ts                    # TypeScript interfaces
│   └── utils.ts                    # Helpers: slugify, normalizePhone, etc.
├── middleware.ts                   # Auth protection + redirects
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Full DB schema
```

---

## Security Notes

- Customer QR codes contain a 64-character hex token — never the phone number or DB ID.
- The service role key is used only in API routes, never exposed to the browser.
- Cooldown is enforced server-side, not client-side.
- Every action (punch, redeem, adjust, block, undo) is logged in `scan_events`.
- Undo is non-destructive — original event is kept, a reversal event is added.
