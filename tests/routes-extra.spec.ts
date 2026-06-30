import { test, expect } from '@playwright/test';

// Additional public pages added in recent work that must load without crashing,
// regardless of auth state. Navigated with relative paths so they resolve
// against the configured baseURL (localhost:3000 in dev, punched.me in CI).
const publicPages = [
  { path: '/auth/confirm-email', name: 'Confirm email page' },
  {
    path: '/auth/confirm-email?email=test%40example.com',
    name: 'Confirm email page with email param',
  },
  { path: '/sticker/inactive', name: 'Sticker inactive page' },
  { path: '/pricing', name: 'Pricing page' },
];

for (const { path, name } of publicPages) {
  test(`${name} loads`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(path);
    await expect(page.locator('body')).toBeVisible();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);

    // Filter out known noisy non-issues (same allowlist as smoke.spec.ts)
    const realErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('net::ERR_ABORTED')
    );
    expect(realErrors, `Console errors on ${path}`).toEqual([]);
  });
}

test('billing redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard/billing');
  await expect(page).toHaveURL(/\/auth\/login/);
});
