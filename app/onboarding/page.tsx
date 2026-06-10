"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, Gift, MapPin, Palette, Sparkles, Send, Smartphone, Plus, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { PassPreviews } from "@/components/PassPreviews";

type OnboardingStep = "how" | "business" | "program";

// ── How it works explainer ────────────────────────────────────────────────────

function HowItWorks({ onStart }: { onStart: () => void }) {
  const steps = [
    "You put your QR code at the counter",
    "Customer scans it with their phone camera",
    "Each visit, they scan again to punch in",
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-12 shadow-sm border border-gray-100 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-10">
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

      {/* iOS — light style notification */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">iPhone</p>
        <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-gray-100">
          <Logo size={40} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-900 text-[13px] font-semibold truncate">{name}</span>
              <span className="text-gray-400 text-[10px] ml-2 shrink-0">now</span>
            </div>
            <p className="text-gray-600 text-[12px] leading-tight truncate">🎉 {reward}</p>
          </div>
        </div>
      </div>

      {/* Android — light style notification */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">Android</p>
        <div className="bg-white rounded-xl p-3 flex items-start gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-gray-100">
          <Logo size={36} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-900 text-[13px] font-semibold truncate">{name}</span>
              <span className="text-gray-400 text-[10px] ml-2 shrink-0">now</span>
            </div>
            <p className="text-gray-600 text-[12px] leading-tight truncate">{reward}</p>
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

  // Logo upload (optional)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      // Resize client-side to max 512px PNG
      const dataUrl: string = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const max = 512;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      // Show it immediately in the previews
      setLogoUrl(dataUrl);

      // Persist to the server (best-effort; preview already works)
      const res = await fetch("/api/business/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data.logoUrl) setLogoUrl(data.logoUrl);
    } catch {
      // keep local preview; they can retry
    } finally {
      setUploadingLogo(false);
    }
  }

  async function matchColorFromLogo() {
    // Native browser eyedropper — pick any pixel on screen (e.g. their logo)
    const EyeDropperCtor = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const result = await new EyeDropperCtor().open();
      if (result?.sRGBHex) setBrandColor(result.sRGBHex);
    } catch {
      // user cancelled
    }
  }

  // Custom request
  const [customRequest, setCustomRequest] = useState("");
  const [customRequestSent, setCustomRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Autofocus first input on each step
  const firstInputRef = useRef<HTMLInputElement>(null);
  const primaryAddrRef = useRef<HTMLInputElement>(null);

  // ── Refresh-proofing: step lives in the URL, data recovers from the server ──
  // On first load, restore the step from ?step= so refresh doesn't restart the wizard
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("step");
    if (s === "business" || s === "program") setStep(s);
  }, []);

  // Keep the URL in sync as they move through steps
  useEffect(() => {
    const url = step === "how" ? "/onboarding" : `/onboarding?step=${step}`;
    window.history.replaceState(null, "", url);
  }, [step]);

  // If they refresh on the program step, recover their business from the server
  useEffect(() => {
    if (step !== "program" || businessId) return;
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.business) {
          setBusinessId(d.business.id);
          setBusinessName(d.business.name ?? "");
          if (d.business.brand_color) setBrandColor(d.business.brand_color);
        } else {
          // No business yet — they can't be on the program step
          setStep("business");
        }
      })
      .catch(() => setStep("business"));
  }, [step, businessId]);
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
          brandColor,
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
        <div className="mb-10 flex justify-center">
          <Logo size={112} />
        </div>

        {/* How it works — full width, no sidebar */}
        {step === "how" && <HowItWorks onStart={() => setStep("business")} />}

        {/* Business + Program steps */}
        {step !== "how" && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-center gap-3 mb-8 px-1">
              {progressSteps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === s.id || (s.id === "business" && step === "program")
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                      : "border border-indigo-300 text-indigo-500 bg-transparent"
                  }`}>
                    {s.id === "business" && step === "program" ? "✓" : i + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{s.label}</span>
                  {i === 0 && <div className="w-16 md:w-24 h-px bg-gray-200" />}
                </div>
              ))}
            </div>

            {/* Main layout */}
            <div className="flex flex-col gap-5">

              {/* Main card */}
              <div className="flex-1">

                {/* ── Step: Business ── */}
                {step === "business" && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-400">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h1 className="text-base font-semibold text-gray-900">Your business</h1>
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
                          className="w-full border border-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            Business address
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-indigo-500 text-indigo-700 text-xs flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div className="flex-1">
                            <AddressAutocomplete
                              inputRef={primaryAddrRef as React.RefObject<HTMLInputElement>}
                              value={address}
                              onChange={setAddress}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddress("");
                              primaryAddrRef.current?.focus();
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Clear this address"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Extra store locations — numbering continues: 2, 3, 4… */}
                        {extraAddresses.map((extra, i) => (
                          <div key={i} className="flex items-center gap-2 mt-3">
                            <div className="w-6 h-6 rounded-full border border-indigo-500 text-indigo-700 text-xs flex items-center justify-center shrink-0">
                              {i + 2}
                            </div>
                            <div className="flex-1">
                              <AddressAutocomplete
                                value={extra}
                                onChange={(v) =>
                                  setExtraAddresses((prev) =>
                                    prev.map((a, j) => (j === i ? v : a))
                                  )
                                }
                                placeholder={`Store ${i + 2} address`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExtraAddresses((prev) => prev.filter((_, j) => j !== i))
                              }
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
                            className="w-[46px] h-[46px] rounded-full border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 flex items-center justify-center transition-colors"
                            title="Add another store location"
                          >
                            <Plus className="w-7 h-7" strokeWidth={1.25} />
                          </button>
                          <span className="text-xs text-gray-500 mt-1.5">Add Location</span>
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
                        className="w-full sm:w-1/2 mx-auto block bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                        style={{ fontSize: "1rem" }}
                      >
                        {loading ? "Saving…" : "Last Step"}
                      </button>
                    </form>
                  </div>
                )}

                {/* ── Step: Program ── */}
                {step === "program" && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-400">
                    <div className="flex flex-col items-center text-center gap-2 mb-6">
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-gray-400" />
                            Pick a card color
                          </span>
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#ec4899", "#8b5cf6", "#1f2937"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBrandColor(c)}
                              className={`w-8 h-8 rounded-full transition-transform ${
                                brandColor === c ? "ring-2 ring-offset-2 ring-indigo-400 scale-110" : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <label className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 text-lg leading-none hover:border-gray-400" title="Custom color">
                            +
                            <input
                              type="color"
                              value={brandColor}
                              onChange={(e) => setBrandColor(e.target.value)}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">You can change this anytime. Watch the cards below update.</p>
                      </div>

                      {/* Logo upload (optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Your logo <span className="text-gray-400">(optional)</span>
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleLogoFile(f);
                              }}
                            />
                            <span className="inline-flex items-center gap-2 border border-gray-400 rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logoUrl || "/logo.png"} alt="" className="w-6 h-6 object-contain" />
                              </span>
                              {uploadingLogo ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                            </span>
                          </label>
                          {logoUrl && typeof window !== "undefined" && "EyeDropper" in window && (
                            <button
                              type="button"
                              onClick={matchColorFromLogo}
                              className="text-xs text-indigo-600 underline underline-offset-2"
                              title="Click, then click any color in your logo to match it exactly"
                            >
                              🎯 Match card color from my logo
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Shows on their wallet card. We size it for Apple &amp; Google automatically.
                        </p>
                      </div>

                      {/* Live wallet pass previews */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                          <Smartphone className="w-3.5 h-3.5" />
                          What their punch card looks like
                        </p>
                        <PassPreviews
                          businessName={businessName}
                          reward={rewardDescription}
                          punchesRequired={punchesRequired}
                          brandColor={brandColor}
                          logoUrl={logoUrl}
                        />
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

                {/* Want something unique — below the program form, last step only */}
                {step === "program" && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-6 mt-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">Want something unique?</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                      <span className="block whitespace-nowrap" style={{ fontSize: "clamp(0.65rem, 2.9vw, 1.01rem)" }}>
                        Custom punch card design, special integrations, branded experience
                      </span>
                      <span className="block">Tell us and we&apos;ll build it for you.</span>
                    </p>

                    {customRequestSent ? (
                      <div className="text-center py-3">
                        <div className="text-2xl mb-1">🎉</div>
                        <p className="text-xs font-semibold text-violet-700">Got it! We&apos;ll be in touch.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleCustomRequest} className="space-y-3">
                        <textarea
                          value={customRequest}
                          onChange={(e) => setCustomRequest(e.target.value)}
                          placeholder="I'd love a punch card that looks like a passport stamp..."
                          rows={3}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
                        />
                        <button
                          type="submit"
                          disabled={sendingRequest || !customRequest.trim()}
                          className="w-full sm:w-1/2 mx-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                          style={{ fontSize: "1rem" }}
                        >
                          <Send className="w-3 h-3" />
                          {sendingRequest ? "Sending…" : "Send request"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
