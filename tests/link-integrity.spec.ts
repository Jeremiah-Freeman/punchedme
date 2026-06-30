import { test, expect, type Page } from '@playwright/test';

// Link integrity / dead-link safety net.
//
// This file is the automated guard against the class of bug where an internal
// link points at a route that returns 404 — e.g. signup once redirected to
// /auth/confirm-email, which 404'd in production. We do this two ways:
//
//   Test 1 (crawl): visit each public page, collect every same-origin
//     <a>/<Link> href the page actually renders, and assert none of them 404.
//   Test 2 (regression guards): explicit assertions on routes we know broke
//     before or are easy to break again.
//
// Everything here is read-only and unauthenticated: we only GET pages and
// follow links. No forms are submitted, so no customers/charges are created.

// Public pages we can reach with no auth. These are the entry points whose
// outbound links we want to keep healthy.
const publicPages = [
  '/',
  '/pricing',
  '/auth/login',
  '/auth/signup',
  '/auth/confirm-email',
  '/sticker/inactive',
];

// A response is "alive" if it isn't a 404 (and isn't a 5xx — a dead link is the
// concern, but a server error on an internal target is just as broken). Auth
// redirects (3xx) and 200s are all fine.
function isAlive(status: number): boolean {
  return status !== 404 && status < 500;
}

// Pull every same-origin href off the rendered page. Next's <Link> renders to a
// plain <a>, so reading anchors covers both <Link> and raw <a>. We resolve each
// href against the current URL so relative links normalize correctly, then keep
// only same-origin http(s) targets (dropping mailto:, tel:, #anchors, external).
async function sameOriginHrefs(page: Page): Promise<string[]> {
  const origin = new URL(page.url()).origin;
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href)
  );

  const internal = new Set<string>();
  for (const href of hrefs) {
    try {
      const u = new URL(href);
      if (u.origin !== origin) continue; // external link, not our concern
      if (!/^https?:$/.test(u.protocol)) continue; // mailto:, tel:, etc.
      internal.add(u.pathname + u.search); // strip hash; dedupe
    } catch {
      // Unparseable href — skip rather than fail the whole crawl.
    }
  }
  return Array.from(internal);
}

for (const path of publicPages) {
  test(`no dead links on ${path}`, async ({ page, request }) => {
    const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
    // The page we're crawling from should itself be alive.
    expect(resp, `no response navigating to ${path}`).not.toBeNull();
    expect(isAlive(resp!.status()), `${path} returned ${resp!.status()}`).toBe(
      true
    );

    const links = await sameOriginHrefs(page);

    // Robust to pages with zero links — the loop simply does nothing and the
    // test passes (the page itself already loaded fine above).
    for (const link of links) {
      // Use a GET request rather than navigating so a redirect chain is
      // followed transparently and we assert on the final landing status.
      // maxRedirects keeps us from hanging on a pathological loop.
      const linkResp = await request.get(link, { maxRedirects: 5 });
      const status = linkResp.status();
      expect(
        isAlive(status),
        `Dead link "${link}" found on ${path} (status ${status})`
      ).toBe(true);
    }
  });
}

// --- Test 2: explicit regression guards ----------------------------------
// These are routes that have broken before or that several flows depend on.
// We assert each resolves to a real page (200) or a redirect — never a 404.

const mustResolve = [
  '/auth/confirm-email', // the original 404 that motivated this file
  '/sticker/inactive', // scanned-too-early landing page
  '/pricing',
  '/auth/login',
  '/auth/signup',
];

for (const path of mustResolve) {
  test(`route resolves (not 404): ${path}`, async ({ request }) => {
    const resp = await request.get(path, { maxRedirects: 5 });
    expect(
      resp.status(),
      `${path} should not 404 — got ${resp.status()}`
    ).not.toBe(404);
    expect(resp.status(), `${path} should not 5xx — got ${resp.status()}`).toBeLessThan(
      500
    );
  });
}

// /dashboard/billing is auth-gated: unauthenticated, middleware 307-redirects it
// to /auth/login. The bug we guard against is it 404'ing instead. Use a real
// page navigation so the redirect is followed, then assert we landed on login —
// proving the route exists and the guard works, not that it's broken.
test('/dashboard/billing redirects to login (not 404) when unauthenticated', async ({
  page,
}) => {
  const resp = await page.goto('/dashboard/billing', {
    waitUntil: 'domcontentloaded',
  });
  expect(resp, 'no response for /dashboard/billing').not.toBeNull();
  expect(resp!.status(), 'billing route 404 / errored').not.toBe(404);
  // We should end up on the login page, not a dead end.
  await expect(page).toHaveURL(/\/auth\/login/);
});
