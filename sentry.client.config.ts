// Sentry — browser runtime. Inert until NEXT_PUBLIC_SENTRY_DSN is set (in
// Vercel and/or .env.local), so this is safe to ship before the DSN lands.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // Low default sampling — turn up once you see real traffic volume.
    tracesSampleRate: 0.1,
    // Record a session replay only when an error happens (cheap on the quota).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
