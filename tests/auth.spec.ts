import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('renders email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder('you@example.com').fill('notreal@example.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 15000 });
  });

  test('has link to signup', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('has forgot password link', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible();
  });
});

test.describe('Signup page', () => {
  test('renders email and password fields', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder(/min 8/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('rejects invalid email (browser validation)', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await page.getByPlaceholder(/min 8/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();
    // Browser native validation blocks submission — page stays on signup
    await expect(page).toHaveURL(/\/auth\/signup/);
    const emailInvalid = await page.locator('input[type="email"]').evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(emailInvalid).toBe(true);
  });

  test('has link back to login', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test('renders email field and submit button', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('shows confirmation after submitting email', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 15000 });
  });
});
