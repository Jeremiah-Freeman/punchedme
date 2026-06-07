import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 15'] });

test('landing page renders on mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('link', { name: /punch in/i }).first()).toBeVisible();
});

test('login page is usable on mobile', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('signup page is usable on mobile', async ({ page }) => {
  await page.goto('/auth/signup');
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  await expect(page.getByPlaceholder(/min 8/i)).toBeVisible();
});

test('join page is usable on mobile', async ({ page }) => {
  await page.goto('/b/kawfi/join');
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('punchedme_token_'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await expect(page.getByPlaceholder('Jay')).toBeVisible({ timeout: 10000 });
});
