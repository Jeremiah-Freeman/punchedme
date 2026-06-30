import { test, expect } from '@playwright/test';

// API security regression suite.
//
// Every test here runs WITHOUT authentication, using the `request` fixture so
// no browser cookies are ever attached. The goal is to lock in the per-endpoint
// auth posture verified against the route source on 2026-06-29, so a future
// refactor can't silently re-open a protected endpoint to the public internet.
//
// These tests are intentionally read-only / side-effect-free:
//   - Protected endpoints are rejected BEFORE any write (we never reach a DB
//     mutation because auth fails first).
//   - Public endpoints are exercised only with bogus inputs that resolve to
//     "not found", so nothing real is created or modified.
//
// All navigations use relative paths so the suite works under both
// playwright.config.ts (localhost:3000) and playwright.config.ci.ts (punched.me).

// Protected endpoints that require an authenticated business owner.
// Each was confirmed in app/api/**/route.ts to call auth.getUser() and return
// 401 when there is no user (and 403 when the user doesn't own the resource).
// An unauthenticated caller can never get past the 401.
const protectedPost = [
  '/api/customers/adjust', // dashboard manual punch adjustment
  '/api/scans/undo', //        undo a recent punch/reward
  '/api/business/program', //  create a loyalty program (POST)
];

const protectedGet = [
  '/api/customers/list', //   roster of a shop's customers
  '/api/customers/lookup', // phone -> pass-token lookup
  '/api/business/me', //      the owner's business + active program
];

// SECURITY REGRESSION GUARD — DO NOT WEAKEN.
// /api/scans/process (forge a punch for any customer) and /api/rewards/redeem
// (redeem any customer's reward) were OPEN endpoints — anyone on the internet
// could POST to them with a businessId/customerId and forge punches or burn
// rewards. They were locked behind owner auth on 2026-06-29. These two tests
// exist specifically so that fix can never be reverted unnoticed: an
// unauthenticated POST MUST be rejected (401/403), never 200.
test.describe('scans/process and rewards/redeem are owner-only (2026-06-29 fix)', () => {
  test('POST /api/scans/process without auth is rejected (was open: forged punches)', async ({
    request,
  }) => {
    const res = await request.post('/api/scans/process', {
      data: { scannedToken: 'fake-token', businessId: 'fake-business-id' },
    });
    // 401 = no user. 403 would mean a user that doesn't own the business; either
    // way an anonymous caller is denied. It must NOT be a 2xx success.
    expect([401, 403]).toContain(res.status());
    expect(res.ok()).toBeFalsy();
  });

  test('POST /api/rewards/redeem without auth is rejected (was open: stolen rewards)', async ({
    request,
  }) => {
    const res = await request.post('/api/rewards/redeem', {
      data: { customerId: 'fake-customer-id', programId: 'fake-program-id' },
    });
    expect([401, 403]).toContain(res.status());
    expect(res.ok()).toBeFalsy();
  });
});

test.describe('protected endpoints reject unauthenticated callers', () => {
  for (const path of protectedPost) {
    test(`POST ${path} without auth returns 401/403`, async ({ request }) => {
      const res = await request.post(path, { data: {} });
      expect([401, 403]).toContain(res.status());
      expect(res.ok()).toBeFalsy();
    });
  }

  for (const path of protectedGet) {
    test(`GET ${path} without auth returns 401/403`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
      expect(res.ok()).toBeFalsy();
    });
  }
});

test.describe('Stripe endpoints', () => {
  // The webhook is intentionally public (Stripe calls it server-to-server), but
  // it MUST reject any request lacking a valid stripe-signature. With no
  // signature header it short-circuits to 400 before touching any handler.
  test('POST /api/stripe/webhook with no stripe-signature returns 400', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      data: { type: 'checkout.session.completed' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/stripe/checkout without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/stripe/checkout', {
      data: { plan: 'starter' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/stripe/portal without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/stripe/portal', { data: {} });
    expect(res.status()).toBe(401);
  });
});

test.describe('public endpoints behave safely', () => {
  // Customer signup is intentionally public (anyone can join a shop from its QR).
  // A bogus slug must resolve to a clean 404 (business not found), never a 500
  // crash, and must not create anything.
  test('POST /api/customers/signup to a bogus slug returns 404, not 500', async ({ request }) => {
    const res = await request.post('/api/customers/signup', {
      data: {
        businessSlug: '__nope__nonexistent_slug__',
        firstName: 'Test',
        phoneNumber: '5035550100',
      },
    });
    // 404 = business not found (the happy path for a bad slug). A rare 429 from
    // the IP rate-limiter is also acceptable; what we never want is a 500.
    expect([404, 429]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  // Public branding lookup used by the join page. Unknown slug -> 404, missing
  // slug -> 400. Both are graceful and must never 500.
  test('GET /api/business/public?slug=__nope__ returns 404 gracefully', async ({ request }) => {
    const res = await request.get('/api/business/public?slug=__nope__nonexistent__');
    expect(res.status()).toBe(404);
  });

  test('GET /api/business/public with no slug returns 400', async ({ request }) => {
    const res = await request.get('/api/business/public');
    expect(res.status()).toBe(400);
  });
});
