import { test, expect } from '@playwright/test';

// Pages that must load without crashing, regardless of auth state
const publicPages = [
  { path: '/', name: 'Landing page' },
  { path: '/auth/signup', name: 'Signup page' },
  { path: '/auth/login', name: 'Login page' },
  { path: '/auth/forgot-password', name: 'Forgot password page' },
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

    // Filter out known noisy non-issues
    const realErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('net::ERR_ABORTED')
    );
    expect(realErrors, `Console errors on ${path}`).toEqual([]);
  });
}

test('join page loads for a slug', async ({ page }) => {
  await page.goto('/b/kawfi/join');
  // Wait for the page to settle past the loading spinner
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(20);
});

test('dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('onboarding redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/auth\/login/);
});
