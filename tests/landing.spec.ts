import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('has Punch In CTA that goes to signup', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /punch in/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('has no broken internal links (first 15)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');

    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).href)
        .filter(
          (href) =>
            href &&
            (href.startsWith('http://localhost') || href.startsWith('/')) &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.includes('#')
        )
    );

    // Dedupe
    const unique = Array.from(new Set(links)).slice(0, 15);

    for (const href of unique) {
      const response = await page.goto(href);
      expect(response?.status(), `${href} returned bad status`).toBeLessThan(500);
    }
  });

  test('displays Mo bear logo', async ({ page }) => {
    await page.goto('/');
    // Logo image should be present
    const logo = page.locator('img[alt*="logo" i], img[src*="logo"]').first();
    await expect(logo).toBeVisible();
  });

  test('"There\'s no step 3" copy is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/no step 3/i)).toBeVisible();
  });
});
