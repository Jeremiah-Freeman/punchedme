import { test, expect } from '@playwright/test';

test.describe('Join page (/b/[slug]/join)', () => {
  const JOIN_URL = '/b/kawfi/join';

  test('shows signup form on first visit (no token)', async ({ page }) => {
    await page.goto(JOIN_URL);
    // Clear any stored token and reload
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('punchedme_token_'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await expect(page.getByPlaceholder('First name')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('541-551-9246')).toBeVisible();
  });

  test('signup form validates short phone number', async ({ page }) => {
    await page.goto(JOIN_URL);
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('punchedme_token_'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await page.getByPlaceholder('First name').fill('Test');
    await page.getByPlaceholder('541-551-9246').fill('123');
    await page.getByRole('button', { name: /join rewards/i }).click();
    await expect(page.getByText(/valid 10-digit phone/i)).toBeVisible({ timeout: 15000 });
  });

  test('page has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(JOIN_URL);
    await page.waitForTimeout(2000);

    const realErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ERR_BLOCKED_BY_CLIENT') &&
        !e.includes('net::ERR_ABORTED')
    );
    expect(realErrors).toEqual([]);
  });
});
