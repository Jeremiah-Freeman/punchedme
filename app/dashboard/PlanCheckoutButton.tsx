"use client";

import { useState } from "react";

// Starts a Stripe Checkout session for the given plan and redirects to it.
// Used by the dashboard milestone card to activate Starter / upgrade to Growth.
export function PlanCheckoutButton({
  plan,
  label,
  className,
}: {
  plan: "starter" | "growth";
  label: string;
  className: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, returnTo: "dashboard" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout. Try again.");
      setLoading(false);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={go} disabled={loading} className={className}>
        {loading ? "Starting…" : label}
      </button>
      {error && <span className="text-xs text-red-200">{error}</span>}
    </span>
  );
}
