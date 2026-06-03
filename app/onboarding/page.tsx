"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Gift, MapPin, Palette, Sparkles, Send } from "lucide-react";

type OnboardingStep = "business" | "program";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("business");

  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [businessId, setBusinessId] = useState("");

  // Program fields
  const [rewardDescription, setRewardDescription] = useState("");
  const [punchesRequired, setPunchesRequired] = useState(10);

  // Custom request
  const [customRequest, setCustomRequest] = useState("");
  const [customRequestSent, setCustomRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBusinessSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/business/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessName, brandColor, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create business");
        return;
      }
      setBusinessId(data.business.id);
      setStep("program");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProgramSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/business/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: `${businessName} Rewards`,
          rewardName: rewardDescription,
          punchesRequired,
          punchCooldownMinutes: 120,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create program");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!customRequest.trim()) return;
    setSendingRequest(true);
    try {
      await fetch("/api/feedback/custom-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: customRequest, businessId: businessId || null }),
      });
      setCustomRequestSent(true);
    } catch {
      setCustomRequestSent(true); // Still show success
    } finally {
      setSendingRequest(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">Punched.me</span>
          <p className="text-sm text-gray-500 mt-1">Set up your loyalty program in 60 seconds.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 px-1">
          {(["business", "program"] as OnboardingStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === s
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : s === "business" && step === "program"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}>
                {s === "business" && step === "program" ? "✓" : i + 1}
              </div>
              <span className="text-sm font-medium text-gray-600 capitalize">{s === "business" ? "Your business" : "Your program"}</span>
              {i === 0 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Main + Sidebar layout */}
        <div className="flex gap-5 items-start">

          {/* Main card */}
          <div className="flex-1">
            {step === "business" ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Your business</h1>
                    <p className="text-sm text-gray-500">Tell us a bit about your place.</p>
                  </div>
                </div>

                <form onSubmit={handleBusinessSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      placeholder="Kawfi Coffee"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        Business address
                      </span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, Austin TX 78701"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Used to send customers a wallet notification when they arrive near you.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-gray-400" />
                        Brand color
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-14 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <span className="text-sm text-gray-400 font-mono">{brandColor}</span>
                      <span className="text-xs text-gray-400">— shown on your customers' wallet cards</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? "Saving…" : "Continue →"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Your loyalty program</h1>
                    <p className="text-sm text-gray-500">Two questions. That&apos;s it.</p>
                  </div>
                </div>

                <form onSubmit={handleProgramSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      How many visits to earn a reward?
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        value={punchesRequired}
                        onChange={(e) => setPunchesRequired(Number(e.target.value))}
                        min={3}
                        max={30}
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="w-12 text-center text-2xl font-bold text-indigo-600">
                        {punchesRequired}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Customer gets their reward after {punchesRequired} visits.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      What&apos;s the reward?
                    </label>
                    <input
                      type="text"
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      required
                      placeholder="Free 12oz coffee of your choice"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This is shown on the customer&apos;s wallet card and in their notification.
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="rounded-xl p-4 text-white text-sm" style={{ backgroundColor: brandColor }}>
                    <div className="opacity-70 text-xs mb-1 uppercase tracking-wide font-medium">Preview · {businessName || "Your Business"}</div>
                    <div className="font-bold text-base">{rewardDescription || "Your reward here"}</div>
                    <div className="opacity-80 text-xs mt-1">after {punchesRequired} visits</div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? "Launching…" : "Launch my program 🚀"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Cute sidebar */}
          <div className="w-56 shrink-0">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-violet-800">Want something unique?</span>
              </div>
              <p className="text-xs text-violet-600 mb-3 leading-relaxed">
                Custom punch card design, special integrations, branded experience — tell us and we&apos;ll build it for you.
              </p>

              {customRequestSent ? (
                <div className="text-center py-3">
                  <div className="text-2xl mb-1">🎉</div>
                  <p className="text-xs font-semibold text-violet-700">Got it! We&apos;ll be in touch.</p>
                </div>
              ) : (
                <form onSubmit={handleCustomRequest} className="space-y-2">
                  <textarea
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder="I'd love a punch card that looks like a passport stamp..."
                    rows={4}
                    className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingRequest || !customRequest.trim()}
                    className="w-full flex items-center justify-center gap-1.5 bg-violet-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    {sendingRequest ? "Sending…" : "Send request"}
                  </button>
                </form>
              )}
            </div>

            {/* Little tip card */}
            <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 <strong>Tip:</strong> Your brand color shows on every customer&apos;s Apple & Google Wallet card. Pick something that pops.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
