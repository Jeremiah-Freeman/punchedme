"use client";

import { useState, useEffect, useCallback } from "react";
import { Monitor, Copy, Check, Trash2, Plus, ChevronDown } from "lucide-react";

interface DeviceToken {
  id: string;
  label: string;
  token: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

// Owner-facing kiosk manager. Lives at the bottom of Scan Mode because that's
// where "set up an unattended scanner" belongs. Generates a /scan/<token> link
// the owner drops into a Raspberry Pi, and lets them revoke a lost device.
export function KioskSetupPanel() {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/business/device-tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function createToken() {
    setCreating(true);
    try {
      const res = await fetch("/api/business/device-tokens", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setCreating(false);
    }
  }

  async function revokeToken(id: string) {
    if (!confirm("Disconnect this kiosk? The scanner will stop working immediately. This can't be undone.")) return;
    const res = await fetch(`/api/business/device-tokens?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  function copyLink(t: DeviceToken) {
    const url = `${origin}/scan/${t.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const active = tokens.filter((t) => !t.revoked_at);

  return (
    <div className="w-full max-w-sm mx-auto mt-8 bg-gray-800/60 rounded-2xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5 text-gray-200 text-sm font-semibold">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Set up an unattended kiosk
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <p className="text-gray-400 text-xs leading-relaxed">
            Generate a scan-only link for a dedicated device (like a Raspberry Pi
            at the counter). It can <span className="text-gray-300 font-medium">only add punches</span> —
            no dashboard, no settings. Lose the device? Disconnect it here and the
            link dies instantly.
          </p>

          {loading ? (
            <p className="text-gray-500 text-xs">Loading…</p>
          ) : active.length === 0 ? (
            <button
              onClick={createToken}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Connect a kiosk"}
            </button>
          ) : (
            <div className="space-y-3">
              {active.map((t) => (
                <div key={t.id} className="bg-gray-900/70 rounded-xl p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-200 text-sm font-medium">{t.label}</span>
                    <button
                      onClick={() => revokeToken(t.id)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate bg-gray-800 text-gray-400 text-xs px-2.5 py-2 rounded-lg">
                      {origin}/scan/{t.token}
                    </code>
                    <button
                      onClick={() => copyLink(t)}
                      className="shrink-0 flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-2 rounded-lg transition-colors"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-2">
                    {t.last_used_at
                      ? `Last scan ${new Date(t.last_used_at).toLocaleString()}`
                      : "Not used yet — open the link on the kiosk to start."}
                  </p>
                </div>
              ))}
              <button
                onClick={createToken}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 text-indigo-400 hover:text-indigo-300 py-2 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                {creating ? "Creating…" : "Add another kiosk"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
