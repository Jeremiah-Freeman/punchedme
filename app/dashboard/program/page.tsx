"use client";

import { useState, useEffect } from "react";
import { Gift, Hash, ToggleLeft, ToggleRight, Clock } from "lucide-react";

interface Program {
  id: string;
  name: string;
  reward_name: string;
  punches_required: number;
  punch_cooldown_minutes: number;
  is_active: boolean;
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
        }
      }
      setLoading(false);
    }
    load();
  }, []);

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
    </div>
  );
}
