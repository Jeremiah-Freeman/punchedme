"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, Gift, MapPin, Palette, Sparkles, Send, Smartphone, Plus, X } from "lucide-react";

type OnboardingStep = "how" | "business" | "program";

// ── How it works explainer ────────────────────────────────────────────────────

function PunchEmblem() {
  return (
    <div className="w-28 h-28 mx-auto rounded-full bg-white shadow-[0_12px_35px_rgba(99,102,241,0.22)] flex items-center justify-center">
      <svg
        viewBox="0 0 130 100"
        className="w-16 h-16"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Punched emblem"
      >
        {/* speed lines */}
        <line x1="8" y1="32" x2="28" y2="32" stroke="#C7C2F4" strokeWidth="7" />
        <line x1="4" y1="50" x2="30" y2="50" stroke="#C7C2F4" strokeWidth="7" />
        <line x1="8" y1="68" x2="28" y2="68" stroke="#C7C2F4" strokeWidth="7" />
        {/* fist body */}
        <path
          d="M50 36 q-1 -12 12 -13 l42 -3 q14 -1 15 13 l2 26 q1 14 -13 16 l-38 4 q-16 2 -18 -13 z"
          stroke="#6D5BE2"
          strokeWidth="7"
          fill="white"
        />
        {/* finger separators */}
        <path d="M70 24 v20" stroke="#6D5BE2" strokeWidth="6" />
        <path d="M86 23 v20" stroke="#6D5BE2" strokeWidth="6" />
        <path d="M102 22 v20" stroke="#6D5BE2" strokeWidth="6" />
        {/* thumb */}
        <path d="M56 60 q14 12 32 6" stroke="#6D5BE2" strokeWidth="7" />
      </svg>
    </div>
  );
}

function HowItWorks({ onStart }: { onStart: () => void }) {
  const steps = [
    "You put your QR code at the counter",
    "Customer scans it with their phone camera",
    "Each visit, they scan again to punch in",
  ];

  return (
    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 text-center">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-10">
        How Punched works
      </h1>

      <div className="mb-10">
        {steps.map((title, i) => (
          <div key={i}>
            {i > 0 && (
              <div className="flex justify-center">
                <div className="w-px h-8 bg-indigo-200" />
              </div>
            )}
            <div className="border border-indigo-200 rounded-2xl px-6 py-7 flex items-center gap-6 text-left">
              <div className="w-14 h-14 rounded-full border border-indigo-300 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-2xl">
                {i + 1}
              </div>
              <p className="font-bold text-gray-900 text-lg md:text-xl">{title}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="font-bold text-gray-900 text-lg md:text-xl leading-snug mb-8">
        The customer does everything from their phone.
        <br />
        You just run your business.
      </p>

      <button
        onClick={onStart}
        className="w-full bg-indigo-600 text-white py-4 rounded-xl text-base md:text-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
      >
        Set up my stupidly simple loyalty program
      </button>
    </div>
  );
}

// ── Google Places address autocomplete ────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (input: HTMLInputElement, options?: object) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => { formatted_address?: string };
          };
        };
      };
    };
  }
}

function AddressInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!mapsKey || !inputRef.current) return;
    if (window.google?.maps?.places) {
      attachAutocomplete();
      return;
    }
    // Load script if not already present
    const existing = document.querySelector('script[data-gmaps]');
    if (!existing) {
      const script = document.createElement("script");
      script.dataset.gmaps = "1";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
      script.async = true;
      script.onload = attachAutocomplete;
      document.head.appendChild(script);
    } else {
      existing.addEventListener("load", attachAutocomplete);
    }

    function attachAutocomplete() {
      if (!inputRef.current || !window.google) return;
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment", "geocode"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.formatted_address) onChange(place.formatted_address);
      });
    }
  }, [mapsKey, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="123 Main St, Austin TX 78701"
      autoComplete="off"
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
    />
  );
}

// ── Notification preview ──────────────────────────────────────────────────────

function NotificationPreview({
  businessName,
  rewardDescription,
  brandColor,
}: {
  businessName: string;
  rewardDescription: string;
  brandColor: string;
}) {
  const name = businessName || "Your Business";
  const reward = rewardDescription || "your reward";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
        <Smartphone className="w-3.5 h-3.5" />
        What the customer&apos;s notification looks like
      </p>

      {/* iOS */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">iPhone</p>
        <div className="bg-[#1c1c1e]/90 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow"
            style={{ backgroundColor: brandColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide truncate">{name}</span>
              <span className="text-white/40 text-[10px] ml-2 shrink-0">now</span>
            </div>
            <p className="text-white text-[13px] font-semibold leading-tight mt-0.5">🎉 You earned your reward!</p>
            <p className="text-white/75 text-[12px] font-light leading-tight truncate">{reward} is ready to claim.</p>
          </div>
        </div>
      </div>

      {/* Android */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">Android</p>
        <div className="bg-[#202124] rounded-xl p-3 flex items-start gap-3 shadow-lg">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="text-white/70 text-[11px] font-medium">{name} · Punched.me</span>
              <span className="text-white/40 text-[10px] ml-2 shrink-0">now</span>
            </div>
            <p className="text-white text-[13px] font-medium leading-tight mt-0.5">You earned your reward!</p>
            <p className="text-white/60 text-[12px] leading-tight truncate">{reward}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("how");

  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [businessId, setBusinessId] = useState("");

  // Extra store locations (optional)
  const [extraAddresses, setExtraAddresses] = useState<string[]>([]);

  // Program fields
  const [rewardDescription, setRewardDescription] = useState("");
  const [punchesRequired, setPunchesRequired] = useState(10);

  // Custom request
  const [customRequest, setCustomRequest] = useState("");
  const [customRequestSent, setCustomRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autofocus first input on each step
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step !== "how") {
      firstInputRef.current?.focus();
    }
  }, [step]);

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

      // Save any extra store locations (best-effort, non-blocking)
      const extras = extraAddresses.map((a) => a.trim()).filter(Boolean);
      for (const extra of extras) {
        try {
          await fetch("/api/business/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: extra }),
          });
        } catch {
          // ignore — they can add it later from Dashboard → Locations
        }
      }

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
      // Go to QR code welcome page instead of dashboard
      router.push("/onboarding/success");
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
      setCustomRequestSent(true);
    } finally {
      setSendingRequest(false);
    }
  }

  // Step indicators (only show after how-it-works)
  const showProgress = step !== "how";
  const progressSteps: { id: OnboardingStep; label: string }[] = [
    { id: "business", label: "Your business" },
    { id: "program", label: "Your program" },
  ];

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Logo emblem */}
        <div className="mb-10">
          <PunchEmblem />
        </div>

        {/* How it works — full width, no sidebar */}
        {step === "how" && <HowItWorks onStart={() => setStep("business")} />}

        {/* Business + Program steps */}
        {step !== "how" && (
          <>
            {/* Progress */}
            <div className="flex items-center gap-3 mb-8 px-1">
              {progressSteps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === s.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                      : s.id === "business" && step === "program"
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}>
                    {s.id === "business" && step === "program" ? "✓" : i + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{s.label}</span>
                  {i === 0 && <div className="flex-1 h-px bg-gray-200" />}
                </div>
              ))}
            </div>

            {/* Main + Sidebar layout */}
            <div className="flex gap-5 items-start">

              {/* Main card */}
              <div className="flex-1">

                {/* ── Step: Business ── */}
                {step === "business" && (
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
                          ref={firstInputRef}
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
                        <AddressInput value={address} onChange={setAddress} />
                        <p className="text-xs text-gray-400 mt-1">
                          Used to send customers a wallet notification when they arrive near you.
                        </p>

                        {/* Extra store locations */}
                        {extraAddresses.map((extra, i) => (
                          <div key={i} className="flex items-center gap-2 mt-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={extra}
                                onChange={(e) =>
                                  setExtraAddresses((prev) =>
                                    prev.map((a, j) => (j === i ? e.target.value : a))
                                  )
                                }
                                placeholder={`Store ${i + 2} address`}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExtraAddresses((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                              title="Remove this location"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add Location button */}
                        <div className="flex flex-col items-center mt-4">
                          <button
                            type="button"
                            onClick={() => setExtraAddresses((prev) => [...prev, ""])}
                            className="w-10 h-10 rounded-full border-2 border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 flex items-center justify-center transition-colors"
                            title="Add another store location"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                          <span className="text-xs text-gray-400 mt-1.5">Add Location</span>
                        </div>
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
                          <span className="text-xs text-gray-400">— shown on wallet cards</span>
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
                )}

                {/* ── Step: Program ── */}
                {step === "program" && (
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          What&apos;s the reward?
                        </label>
                        <input
                          ref={firstInputRef}
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

                      {/* Wallet card preview — centered, no label inside */}
                      <div
                        className="rounded-xl p-5 text-white flex flex-col items-center text-center"
                        style={{ backgroundColor: brandColor }}
                      >
                        <div className="font-bold text-lg leading-tight">
                          {rewardDescription || "Your reward here"}
                        </div>
                        <div className="opacity-75 text-xs mt-1.5">after {punchesRequired} visits</div>
                      </div>

                      {/* Notification preview */}
                      <NotificationPreview
                        businessName={businessName}
                        rewardDescription={rewardDescription}
                        brandColor={brandColor}
                      />

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
                        {loading ? "Launching…" : "Start My Loyalty Program 🚀"}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Sidebar */}
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

                <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    💡 <strong>Tip:</strong> Your brand color shows on every customer&apos;s Apple & Google Wallet card. Pick something that pops.
                  </p>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
