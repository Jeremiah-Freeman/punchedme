"use client";

// Top-level error boundary for the App Router. Reports the crash to Sentry
// (no-op until the DSN is set) and shows a minimal fallback. Must render its
// own <html>/<body> because it replaces the root layout when it fires.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: 16 }}>
            We hit an unexpected error. Please try again.
          </p>
          <a href="/" style={{ color: "#6366f1", fontWeight: 600 }}>
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
