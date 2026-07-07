"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Smartphone, Phone, MapPin, CheckCircle2, Clock } from "lucide-react";
import type { ScanResult, SignupResult } from "@/lib/types";
import { footerLine, rankUpLine } from "@/lib/loyalty-flavor";

type PageState =
  | "checking"       // initial — localStorage check + GPS for returning customers
  | "checking_in"    // returning customer — calling checkin API
  | "punch_result"   // returning customer — showing punch result
  | "too_far"        // GPS rejected — too far from store
  | "location_required" // shop has a location but we got no GPS (denied/desktop)
  | "closed"         // overnight — punches paused
  | "signup"         // new customer — show form
  | "signup_success"; // just signed up

const GEO_TIMEOUT_MS = 7000;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getStoredToken(slug: string): string | null {
  try {
    return localStorage.getItem(`punchedme_token_${slug}`);
  } catch {
    return null;
  }
}

function storeToken(slug: string, token: string) {
  try {
    localStorage.setItem(`punchedme_token_${slug}`, token);
  } catch {}
}

// Format a US phone as the customer types: 541-551-9246. Strips non-digits,
// drops a leading "1", and only adds hyphens once the groups fill in.
function formatPhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function getGPS(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos.coords);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS }
    );
  });
}

export default function JoinPage() {
  const params = useParams<{ businessSlug: string }>();
  const slug = params.businessSlug;

  const [pageState, setPageState] = useState<PageState>("checking");
  const [businessName, setBusinessName] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<ScanResult | null>(null);
  const [signupResult, setSignupResult] = useState<SignupResult | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const performCheckin = useCallback(
    async (token: string, lat: number | null, lng: number | null) => {
      setPageState("checking_in");
      try {
        const res = await fetch("/api/scans/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerToken: token,
            businessSlug: slug,
            latitude: lat,
            longitude: lng,
          }),
        });
        const data = await res.json();
        if (data.status === "too_far") {
          setPageState("too_far");
          return;
        }
        if (data.status === "location_required") {
          setPageState("location_required");
          return;
        }
        if (data.status === "closed") {
          setPageState("closed");
          return;
        }
        // Orphaned/stale card (deleted record, shop changed slug, program turned
        // off) comes back as "invalid" with no punch data — clear the dead token
        // and let them re-join cleanly instead of rendering "Welcome back, undefined".
        if (data.status === "invalid" || !data.customerName) {
          try { localStorage.removeItem(`punchedme_token_${slug}`); } catch {}
          setPageState("signup");
          return;
        }
        setPunchResult(data as ScanResult);
        setPageState("punch_result");
      } catch {
        // Network error — fall back to signup form
        setPageState("signup");
      }
    },
    [slug]
  );

  useEffect(() => {
    // Fetch public business info for display
    fetch(`/api/business/public?slug=${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.name) setBusinessName(d.name);
        if (d?.brand_color) setBrandColor(d.brand_color);
        if (d?.logo_url) setLogoUrl(d.logo_url);
      })
      .catch(() => {});

    const storedToken = getStoredToken(slug);

    if (!storedToken) {
      // New customer — show form immediately, no GPS needed
      setPageState("signup");
      return;
    }

    // Returning customer — get GPS then check in
    getGPS().then((coords) => {
      performCheckin(
        storedToken,
        coords?.latitude ?? null,
        coords?.longitude ?? null
      );
    });
  }, [slug, performCheckin]);

  // Punch confirmation — a quick two-tone "ding" + a buzz the moment a punch
  // lands. Best-effort: iOS Safari may keep the AudioContext suspended until a
  // tap, so the on-screen confirmation is always the primary feedback.
  useEffect(() => {
    if (pageState !== "punch_result" || !punchResult) return;
    if (punchResult.status !== "success" && punchResult.status !== "reward_available") return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const now = ctx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.2);
      });
      navigator.vibrate?.(60);
    } catch {
      // No audio support — the visual confirmation carries it.
    }
  }, [pageState, punchResult]);

  // Right after signing up, auto-open the Apple Wallet add sheet on iOS — it
  // surfaces as an overlay without leaving this "You're in!" screen, so the
  // customer never has to hunt for a button. Android/Google Wallet opens a full
  // page, so that stays an explicit tap. The buttons remain as the fallback.
  useEffect(() => {
    if (pageState !== "signup_success" || !signupResult?.appleWalletUrl) return;
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) return;
    const appleUrl = signupResult.appleWalletUrl;
    const t = setTimeout(() => {
      window.location.href = appleUrl;
    }, 1200);
    return () => clearTimeout(t);
  }, [pageState, signupResult]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/customers/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessSlug: slug,
          firstName: firstName.trim(),
          phoneNumber: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      const result = data as SignupResult;
      storeToken(slug, result.publicToken);
      setSignupResult(result);
      setPageState("signup_success");
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setFormLoading(false);
    }
  }

  // ─── Loading states ───────────────────────────────────────────────

  if (pageState === "checking" || pageState === "checking_in") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {pageState === "checking_in" ? "Checking you in…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  // ─── Too far ───────────────────────────────────────────────────────

  if (pageState === "too_far") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <MapPin className="w-14 h-14 text-orange-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">You&apos;re not at the store</h1>
          <p className="text-gray-500">
            This QR only works when you&apos;re physically at{" "}
            {businessName || "the store"}. Come in and scan again!
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "location_required") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <MapPin className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Turn on location</h1>
          <p className="text-gray-500 mb-6">
            {businessName || "This shop"} checks that you&apos;re here before adding a
            punch. Allow location access, then try again.
          </p>
          <button
            type="button"
            onClick={() => {
              const token = getStoredToken(slug);
              if (!token) { setPageState("signup"); return; }
              setPageState("checking_in");
              getGPS().then((coords) =>
                performCheckin(token, coords?.latitude ?? null, coords?.longitude ?? null)
              );
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            I&apos;ve enabled location — try again
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "closed") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <Clock className="w-14 h-14 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Punches are paused for the night</h1>
          <p className="text-gray-500">
            {businessName || "This shop"} isn&apos;t open right now. Come by during
            the day and scan again!
          </p>
        </div>
      </div>
    );
  }

  // ─── Returning customer punch result ──────────────────────────────

  if (pageState === "punch_result" && punchResult) {
    const isReward = punchResult.status === "reward_available";
    const isBlocked = punchResult.status === "blocked";

    if (isReward) {
      return (
        <div className="min-h-screen bg-amber-400 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-4xl font-black text-white mb-3 drop-shadow-lg">
              REWARD EARNED!
            </h1>
            <p className="text-2xl text-amber-900 font-bold mb-2">
              {punchResult.customerName}
            </p>
            <p className="text-white/90 text-lg mb-8">{punchResult.message}</p>
            <div className="bg-white rounded-2xl p-5 shadow-xl">
              <p className="text-sm font-semibold text-gray-700">
                Show this screen to the cashier to claim your reward
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isBlocked) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <Clock className="w-14 h-14 text-orange-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-3">Already punched today!</h1>
            <p className="text-gray-600 mb-4">{punchResult.message}</p>
            <p className="text-sm text-gray-400">
              Thanks for coming in, {punchResult.customerName} 👋
            </p>
          </div>
        </div>
      );
    }

    // Success
    const pct = Math.min(
      100,
      (punchResult.currentPunches / punchResult.punchesRequired) * 100
    );
    const oneAway =
      punchResult.currentPunches === punchResult.punchesRequired - 1;
    const lifetime = punchResult.lifetimePunches ?? null;
    const leveledUp = punchResult.rankJustEarned ?? null;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-1">Punched in!</h1>
          <p className="text-gray-500 mb-6">
            Welcome back, {punchResult.customerName} 👋
          </p>

          {/* Moe Money — the same punch, with a couple zeros stapled on, and we
              say so. */}
          {punchResult.moeMoney != null && (
            <div className="mb-6">
              <p className="text-4xl font-black text-indigo-600 tabular-nums">
                +{(100).toLocaleString()} Moe Money
              </p>
              <p className="text-xs text-gray-400 mt-1">
                That&apos;s one punch. Big numbers just feel nice. We checked.
              </p>
            </div>
          )}

          {/* Rank-up gets its own beat when you cross a threshold. */}
          {leveledUp && (
            <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-4">
              <p className="text-xs uppercase tracking-wide text-indigo-200 mb-1">
                New status
              </p>
              <p className="text-2xl font-black mb-1">{leveledUp}</p>
              <p className="text-sm text-indigo-100">{rankUpLine(leveledUp)}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-6 mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Your card</span>
              <span className="font-bold text-gray-900">
                {punchResult.currentPunches} / {punchResult.punchesRequired}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-indigo-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {oneAway && (
              <p className="text-sm text-amber-600 font-semibold mt-3">
                ⚡ One more visit earns your reward!
              </p>
            )}
            {lifetime != null && (
              <p className="text-xs text-gray-400 mt-3">
                Visit #{lifetime.toLocaleString()}
                {punchResult.rank ? ` · ${punchResult.rank}` : ""} · these never
                reset
              </p>
            )}
          </div>

          <p className="text-sm text-gray-400">
            {footerLine(lifetime ?? punchResult.currentPunches)}
          </p>
        </div>
      </div>
    );
  }

  // ─── Signup success ───────────────────────────────────────────────

  if (pageState === "signup_success" && signupResult) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            You&apos;re in! 🎉
          </h1>
          <p className="text-gray-600 mb-8">
            Add your card to your phone — it&apos;ll pop up on your lock screen
            every time you&apos;re near the store.
          </p>

          <div className="space-y-3 mb-8">
            {signupResult.appleWalletUrl && (
              <a
                href={signupResult.appleWalletUrl}
                className="flex items-center justify-center gap-3 w-full bg-black text-white py-4 rounded-xl text-base font-semibold hover:bg-gray-900 transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                Add to Apple Wallet
              </a>
            )}
            {signupResult.googleWalletUrl && (
              <a
                href={signupResult.googleWalletUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-blue-600 text-white py-4 rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                Add to Google Wallet
              </a>
            )}
            <a
              href={signupResult.fallbackPassUrl}
              className="flex items-center justify-center gap-3 w-full border-2 border-gray-200 text-gray-700 py-4 rounded-xl text-base font-semibold hover:border-gray-300 transition-colors"
            >
              View My Card
            </a>
          </div>

          <p className="text-xs text-gray-400">
            Next time you visit, just scan the same QR code. It&apos;ll
            automatically punch you in — no form, no waiting.
          </p>
        </div>
      </div>
    );
  }

  // ─── New customer signup form ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="w-20 h-20 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {businessName ? businessName.slice(0, 1).toUpperCase() : "?"}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            No card. No app. Just rewards.
          </h1>
          <p className="text-gray-600 text-sm">
            {businessName
              ? `Join ${businessName}'s loyalty program.`
              : "Join and keep your punch card on your phone."}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
              autoComplete="given-name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="541-551-9246"
                required
                inputMode="tel"
                autoComplete="tel"
                maxLength={12}
                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {formError && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl text-base font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {formLoading ? "Joining…" : "Join Rewards"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          We&apos;ll never spam you. Your number is only used to identify your
          rewards card.
        </p>
      </div>
    </div>
  );
}
