import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Customer-facing join experience.
//
// HARD CONSTRAINTS (read-only, no data creation):
//  - Never submit a COMPLETE/valid phone — that would insert a real customer.
//  - Only navigate, inspect the rendered form, and assert validation behavior.
//  - Works under both playwright.config.ts (localhost:3000, auto dev server) and
//    playwright.config.ci.ts (https://punched.me) via RELATIVE paths + baseURL.
//
// 'kawfi' is a real shop slug that exists in prod.
// ─────────────────────────────────────────────────────────────────────────────

const REAL_SLUG = 'kawfi';

// The signup-form heading rendered for a brand-new (no-token) visitor.
const FORM_HEADING = /No card\. No app\. Just rewards\./i;
// The "You're in!" heading only appears AFTER a successful signup — it must
// never show in these tests, since that would mean we created a customer.
const SUCCESS_HEADING = /You're in!/i;

// The join page is a client component that briefly shows a "Loading…" spinner
// while it fetches public business info, then renders the signup form for a
// new visitor. Wait for the form (not the spinner) before asserting.
async function gotoFreshJoin(page: import('@playwright/test').Page, slug: string) {
  await page.goto(`/b/${slug}/join`);
  // A first-time visitor has no stored token, so the form renders without GPS.
  await expect(page.getByRole('heading', { name: FORM_HEADING })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Join page — new customer form', () => {
  test('renders the business branding and a join form with name + phone', async ({
    page,
  }) => {
    await gotoFreshJoin(page, REAL_SLUG);

    // Branding / heading copy.
    await expect(
      page.getByRole('heading', { name: FORM_HEADING })
    ).toBeVisible();

    // First-name input — matched by its placeholder (also has label "First name").
    const firstName = page.getByPlaceholder('First name');
    await expect(firstName).toBeVisible();
    await expect(firstName).toHaveAttribute('type', 'text');

    // Phone input — type=tel with the formatted placeholder.
    const phone = page.getByPlaceholder('541-551-9246');
    await expect(phone).toBeVisible();
    await expect(phone).toHaveAttribute('type', 'tel');

    // Visible labels confirm the form structure.
    await expect(page.getByText('First name', { exact: true })).toBeVisible();
    await expect(page.getByText('Phone number', { exact: true })).toBeVisible();

    // The submit CTA.
    await expect(
      page.getByRole('button', { name: /Join Rewards/i })
    ).toBeVisible();

    // We never reached a success state just by loading the form.
    await expect(page.getByRole('heading', { name: SUCCESS_HEADING })).toHaveCount(
      0
    );
  });

  test('both inputs are required (empty submit is blocked client-side)', async ({
    page,
  }) => {
    await gotoFreshJoin(page, REAL_SLUG);

    // Safety net: hard-block any signup POST so this test can never write to
    // prod, and so we can prove no request fired on an empty submit.
    let signupFired = false;
    await page.route('**/api/customers/signup', (route) => {
      signupFired = true;
      return route.abort();
    });

    const firstName = page.getByPlaceholder('First name');
    const phone = page.getByPlaceholder('541-551-9246');

    // Required attributes drive native validation — no server hit on empty submit.
    await expect(firstName).toHaveAttribute('required', '');
    await expect(phone).toHaveAttribute('required', '');

    // Click submit with everything empty. HTML5 validation should stop it.
    await page.getByRole('button', { name: /Join Rewards/i }).click();

    // The first required field reports invalid → form never submitted.
    const firstNameValid = await firstName.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(firstNameValid).toBe(false);

    // Load-bearing: the form must NOT have navigated and must NOT have POSTed.
    await expect(page).toHaveURL(/\/b\/kawfi\/join/);
    expect(signupFired, 'empty submit must not POST to signup').toBe(false);

    // Still on the form, never on the success screen.
    await expect(page.getByRole('heading', { name: FORM_HEADING })).toBeVisible();
    await expect(page.getByRole('heading', { name: SUCCESS_HEADING })).toHaveCount(
      0
    );
  });

  test('an obviously invalid phone does not reach a success state', async ({
    page,
  }) => {
    await gotoFreshJoin(page, REAL_SLUG);

    // Hard-block the signup POST so an accidental submit can NEVER reach prod's
    // database — the assertion below proves we don't reach success regardless.
    await page.route('**/api/customers/signup', (route) => route.abort());

    const firstName = page.getByPlaceholder('First name');
    const phone = page.getByPlaceholder('541-551-9246');

    await firstName.fill('Testbot');

    // Type an obviously invalid / incomplete number. The page's formatPhone()
    // strips non-digits and only this fragment remains — never a real 10-digit
    // number, so no valid customer can be created.
    await phone.fill('123');

    // The field formats/keeps only the junk we typed — it is NOT a valid US
    // phone (3 digits, not 10). Assert it stayed short rather than completing.
    const phoneValue = await phone.inputValue();
    expect(phoneValue.replace(/\D/g, '').length).toBeLessThan(10);

    // Attempt submit. Even if it reaches the API, an incomplete number must be
    // rejected — we assert we NEVER land on the success screen.
    await page.getByRole('button', { name: /Join Rewards/i }).click();

    // Give any client validation / network round-trip a beat to resolve.
    // Success heading must never appear; we must remain on the join flow.
    await expect(page.getByRole('heading', { name: SUCCESS_HEADING })).toHaveCount(
      0,
      { timeout: 5_000 }
    );

    // We are still on a /join URL (no navigation to a card/success route).
    await expect(page).toHaveURL(/\/b\/kawfi\/join/);

    // Either the form is still shown, or an inline error surfaced — both are
    // acceptable "not a success" outcomes. Assert the form is still present.
    await expect(page.getByRole('button', { name: /Join Rewards/i })).toBeVisible();
  });
});

test.describe('Edge cases — bad token and unknown shop', () => {
  test('/pass/<bad-token> returns 404 (notFound)', async ({ page }) => {
    // The fallback pass page calls notFound() when no customer matches the token.
    const res = await page.goto('/pass/__definitely-not-a-real-token__');
    expect(res?.status()).toBe(404);

    // Next.js renders its not-found UI — the page should still render text,
    // not blow up with a server error.
    await expect(page.locator('body')).toBeVisible();
  });

  test('/b/<unknown-shop>/join renders a graceful state (no crash)', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // The public-business API 404s for an unknown slug, but the client page
    // swallows that and still renders the generic signup form — no 500.
    const res = await page.goto('/b/__no-such-shop__/join');

    // Route itself loads (it's a client page; the unknown slug is handled in JS).
    expect(res?.status()).not.toBe(500);

    await expect(page.locator('body')).toBeVisible();

    // It renders the same generic form (fallback copy, "?" avatar) rather than
    // crashing or showing nothing.
    await expect(
      page.getByRole('heading', { name: FORM_HEADING })
    ).toBeVisible({ timeout: 15_000 });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);

    // No uncaught client exceptions while handling the unknown shop.
    expect(pageErrors, 'Uncaught page errors on unknown shop').toEqual([]);
  });
});
