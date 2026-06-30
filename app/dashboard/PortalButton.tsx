"use client";

import { useState } from "react";

// Opens the Stripe billing portal (update card / invoices / cancel).
export function PortalButton({ label, className }: { label: string; className: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not open billing. Try again.");
      setLoading(false);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={go} disabled={loading} className={className}>
        {loading ? "Opening…" : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
