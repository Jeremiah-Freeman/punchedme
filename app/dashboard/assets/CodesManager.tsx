"use client";

import { useEffect, useState } from "react";
import { QrCode, Plus, Check } from "lucide-react";

type Code = { code: string; claimed_at: string | null };

// Manage the business's physical /c/<code> codes — stickers and the counter
// stand. Lost a sticker? Got your wood stand in the mail? Type its code here to
// activate it. It joins the same program instantly; existing members are
// unaffected because they belong to the business, not the code.
export default function CodesManager() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/business/codes");
      const d = await r.json();
      setCodes(d.codes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/business/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ kind: "err", text: d.error ?? "Could not activate that code." });
        return;
      }
      setMsg({
        kind: "ok",
        text: d.alreadyYours ? "That code is already active for your shop." : `Activated ${code}.`,
      });
      setInput("");
      load();
    } catch {
      setMsg({ kind: "err", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
      <h2 className="font-semibold text-gray-900 mb-1">Your QR codes</h2>
      <p className="text-sm text-gray-500 mb-4">
        Lost a sticker or got your counter stand in the mail? Enter its code to
        activate it — your members keep all their punches, no matter which code
        they scan.
      </p>

      <form onSubmit={activate} className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. 7F3A2B)"
          className="flex-1 min-w-0 border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {busy ? "Activating…" : "Activate"}
        </button>
      </form>

      {msg && (
        <div
          className={`text-sm px-4 py-2.5 rounded-xl mb-4 ${
            msg.kind === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
      ) : codes.length === 0 ? (
        <p className="text-sm text-gray-400">
          No codes activated yet. Your printed stickers and counter stand will
          show up here once you enter one.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
          {codes.map((c) => (
            <li key={c.code} className="flex items-center gap-3 px-4 py-3">
              <QrCode className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-mono text-sm tracking-wider text-gray-800">
                {c.code}
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                <Check className="w-3.5 h-3.5" /> Active
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
