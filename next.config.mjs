/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load native/CJS wallet deps as runtime externals instead of bundling them.
  // Minifying them into the serverless function breaks their constructors
  // ("TypeError: E is not a constructor" on Apple Wallet pass generation).
  experimental: {
    serverComponentsExternalPackages: ["archiver", "node-forge"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

import { withSentryConfig } from "@sentry/nextjs";

// Sentry build-time wrapper. With no SENTRY_* env present it just passes the
// config through (no source-map upload, no auth needed), so the build works
// before the DSN/org/project are configured. Fill these in Vercel to enable
// readable stack traces in production.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Route browser error reports through our domain to dodge ad-blockers.
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
