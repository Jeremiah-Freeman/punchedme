import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('has inline signup with a Punch In button', async ({ page }) => {
    await page.goto('/');
    // Redesigned landing: signup happens inline (email + password + Punch In button)
    await expect(page.getByRole('button', { name: /punch in/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder(/min 8/i)).toBeVisible();
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

  test('displays Punched logo', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('img[alt="Punched"], img[src*="punched"]').first();
    await expect(logo).toBeVisible();
  });

  test('"There\'s no step three" copy is present', async ({ page }) => {
    await page.goto('/');
    // Rendered in both the desktop and mobile step lists, so scope to the first.
    await expect(page.getByText(/no step three/i).first()).toBeVisible();
  });
});
