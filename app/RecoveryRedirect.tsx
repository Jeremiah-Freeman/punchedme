"use client";

import { useEffect } from "react";

/**
 * Safety net for password-reset links.
 *
 * Supabase forces the recovery redirect to the bare Site URL (the home page),
 * so the reset code is delivered to "/" as either `?code=...` (PKCE) or a
 * `#access_token=...&type=recovery` hash (implicit). The landing page has no
 * Supabase client to consume it, so the user just sees marketing — the
 * "recycling to the home page" bug.
 *
 * This runs the instant the home page mounts: if a recovery token is present,
 * it forwards to /auth/reset-password (preserving the query string and hash),
 * where the session exchange actually happens. Pure client-side, so it works
 * regardless of middleware, edge redirects, or which deployment is live.
 */
export default function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    const hasCode = params.has("code");
    const hasRecoveryHash =
      hash.includes("access_token") || hash.includes("type=recovery");

    if (hasCode || hasRecoveryHash) {
      window.location.replace(
        `/auth/reset-password${window.location.search}${hash}`
      );
    }
  }, []);

  return null;
}
