// Next.js instrumentation hook — loads the right Sentry config per runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in nested React Server Components (Sentry v8+).
export { captureRequestError as onRequestError } from "@sentry/nextjs";
