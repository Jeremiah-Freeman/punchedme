"use client";

import { useState, useEffect } from "react";
import { Gift, Hash, ToggleLeft, ToggleRight, Clock, Plus, X } from "lucide-react";

interface Program {
  id: string;
  name: string;
  reward_name: string;
  punches_required: number;
  punch_cooldown_minutes: number;
  is_active: boolean;
}

interface RungRow {
  cost: number;
  rewardName: string;
}

export default function ProgramPage() {
  const [program, setProgram] = useState<Program | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [rewardName, setRewardName] = useState("");
  const [punchesRequired, setPunchesRequired] = useState(10);
  const [cooldownMinutes, setCooldownMinutes] = useState(1440);
  const [isActive, setIsActive] = useState(true);

  // Reward menu (rungs)
  const [rungs, setRungs] = useState<RungRow[]>([]);
  const [rungsSaving, setRungsSaving] = useState(false);
  const [rungsSaved, setRungsSaved] = useState(false);
  const [rungsError, setRungsError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/business/me");
      if (res.ok) {
        const data = await res.json();
        setBusinessId(data.business.id);
        if (data.program) {
          const p = data.program as Program;
          setProgram(p);
          setName(p.name);
          setRewardName(p.reward_name);
          setPunchesRequired(p.punches_required);
          setCooldownMinutes(p.punch_cooldown_minutes ?? 1440);
          setIsActive(p.is_active);

          // Load the reward menu for this program.
          try {
            const rr = await fetch(`/api/business/rungs?programId=${p.id}`);
            if (rr.ok) {
              const rd = await rr.json();
              const rows = (rd.rungs ?? []).map(
                (r: { cost: number; reward_name: string }) => ({
                  cost: r.cost,
                  rewardName: r.reward_name,
                })
              );
              setRungs(
                rows.length
                  ? rows
                  : [{ cost: p.punches_required, rewardName: p.reward_name }]
              );
            }
          } catch {
            // Non-fatal — the editor just starts from the base reward.
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateRung(i: number, patch: Partial<RungRow>) {
    setRungs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRung() {
    setRungs((prev) => (prev.length >= 3 ? prev : [...prev, { cost: 0, rewardName: "" }]));
  }
  function removeRung(i: number) {
    setRungs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveRungs() {
    if (!program) return;
    setRungsError("");
    setRungsSaving(true);
    try {
      const res = await fetch("/api/business/rungs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program.id, rungs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRungsError(data.error ?? "Couldn't save your reward menu.");
        return;
      }
      const rows = (data.rungs ?? []).map(
        (r: { cost: number; reward_name: string }) => ({
          cost: r.cost,
          rewardName: r.reward_name,
        })
      );
      if (rows.length) setRungs(rows);
      setRungsSaved(true);
      setTimeout(() => setRungsSaved(false), 2000);
    } catch {
      setRungsError("Network error. Try again.");
    } finally {
      setRungsSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const method = program ? "PATCH" : "POST";
      const body = program
        ? {
            programId: program.id,
            name,
            rewardName,
            punchesRequired,
            punchCooldownMinutes: cooldownMinutes,
            isActive,
          }
        : {
            businessId,
            name,
            rewardName,
            punchesRequired,
            punchCooldownMinutes: cooldownMinutes,
          };

      const res = await fetch("/api/business/program", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }

      setProgram(data.program);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Loyalty Program</h1>
      <p className="text-gray-500 text-sm mb-8">
        {program ? "Update your reward settings." : "Create your loyalty program."}
      </p>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Gift className="w-4 h-4" /> Program name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Coffee Rewards"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Gift className="w-4 h-4" /> Reward name
          </label>
          <input
            type="text"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            required
            placeholder="Free Drink"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Hash className="w-4 h-4" /> Punches required
          </label>
          <input
            type="number"
            value={punchesRequired}
            onChange={(e) => setPunchesRequired(Number(e.target.value))}
            required
            min={1}
            max={100}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Clock className="w-4 h-4" /> Time between punches
          </label>
          <select
            value={cooldownMinutes}
            onChange={(e) => setCooldownMinutes(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value={0}>No limit — punch every visit</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={240}>4 hours</option>
            <option value={480}>8 hours</option>
            <option value={1440}>Once per day (recommended)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Prevents the same customer from scanning multiple times in one visit.
          </p>
        </div>

        {program && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Program active</p>
              <p className="text-xs text-gray-500">Disable to pause accepting new punches.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="text-indigo-600"
            >
              {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : program ? "Save changes" : "Create program"}
        </button>
      </form>

      {program && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
          <h2 className="text-lg font-bold mb-1">What can your regulars earn?</h2>
          <p className="text-gray-500 text-sm mb-5">
            A short menu of rewards. Bigger rewards cost more punches. Regulars can
            claim any reward they&apos;ve reached — or keep saving toward a bigger
            one. Punches never reset.
          </p>

          <div className="space-y-3">
            {rungs.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={r.rewardName}
                  onChange={(e) => updateRung(i, { rewardName: e.target.value })}
                  placeholder={i === 0 ? "Free cookie" : "Free drink"}
                  className="flex-1 min-w-0 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    value={r.cost || ""}
                    onChange={(e) => updateRung(i, { cost: Number(e.target.value) })}
                    min={1}
                    max={200}
                    className="w-20 border border-gray-300 rounded-xl px-3 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-500">punches</span>
                </div>
                {rungs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRung(i)}
                    aria-label="Remove reward"
                    className="text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {rungs.length < 3 && (
            <button
              type="button"
              onClick={addRung}
              className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold mt-3 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add a reward
            </button>
          )}

          {rungsError && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
              {rungsError}
            </div>
          )}

          <button
            type="button"
            onClick={saveRungs}
            disabled={rungsSaving}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors mt-4"
          >
            {rungsSaving ? "Saving…" : rungsSaved ? "Saved ✓" : "Save reward menu"}
          </button>
        </div>
      )}
    </div>
  );
}
