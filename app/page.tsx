import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import RecoveryRedirect from "./RecoveryRedirect";
import ScrollReset from "./ScrollReset";
import HeroSignupForm from "./HeroSignupForm";

// Build a responsive font-size, optionally scaled. Uses container query units
// (cqw = % of the circle's width) so text scales to the circle, not the
// viewport — that keeps it from overflowing once the circle is size-capped.
function fs(px: number, cqw: number, scale = 1): string {
  return `max(${Math.round(px * scale)}px, ${(cqw * scale).toFixed(2)}cqw)`;
}

interface StepData {
  step: string;
  scale?: number;
  labelTop?: string;
  bullets: string[];
  closing?: string | null;
}

function StepCircle({ s }: { s: StepData }) {
  const k = s.scale ?? 1;
  return (
    <div
      className="relative rounded-full border-2 border-indigo-400 flex flex-col items-center justify-center text-center w-full"
      style={{ aspectRatio: "1", maxWidth: "min(92vw, 80vh)", containerType: "inline-size", scrollSnapAlign: "center" }}
    >
      {/* STEP label — pinned near the top (sizes/positions relative to the circle) */}
      <p
        style={{ position: "absolute", top: s.labelTop ?? "9cqw", fontSize: "max(28px, 4.4cqw)" }}
        className="font-bold tracking-widest text-indigo-500 uppercase"
      >
        {s.step.replace(/\d+/, "")}
        <span className="num" style={{ fontWeight: 300, WebkitTextStroke: "0.4px currentColor" }}>
          {s.step.match(/\d+/)?.[0]}
        </span>
      </p>

      <div className="flex flex-col items-center" style={{ width: "80%", gap: fs(8, 1, k) }}>
        {s.bullets.map((b, i) =>
          b === "" ? (
            <div key={i} style={{ height: fs(10, 1.2, k) }} />
          ) : b === "+" ? (
            <p key={i} style={{ fontSize: "max(30px, 4.5cqw)", fontWeight: 200, lineHeight: 1 }} className="text-gray-900">
              +
            </p>
          ) : b.startsWith("SUBTITLE:") ? (
            <p key={i} style={{ fontSize: fs(16, 2.4, k), lineHeight: 1.5 }} className="text-gray-900">
              {b.replace("SUBTITLE:", "")}
            </p>
          ) : b.startsWith("TITLE:") ? (
            <p
              key={i}
              style={{ fontSize: fs(24, 3.6, k), lineHeight: 1.2, marginBottom: fs(6, 0.8, k) }}
              className="font-bold text-gray-900"
            >
              {b.replace("TITLE:", "")}
            </p>
          ) : (
            <p key={i} style={{ fontSize: fs(18, 2.8, k), lineHeight: 1.5 }} className="text-gray-900">
              {b}
            </p>
          )
        )}
        {s.closing && (
          <p style={{ fontSize: fs(18, 2.8, k), lineHeight: 1.5 }} className="font-semibold text-gray-900">
            {s.closing}
          </p>
        )}
      </div>
    </div>
  );
}

// 3 dots + 2 gradient lines — the recurring divider motif.
function DotDivider() {
  return (
    <div className="flex items-center justify-center w-32 mx-auto my-5">
      <span className="w-0.5 h-0.5 rounded-full shrink-0" style={{ background: "#6366f1" }} />
      <span className="flex-1 mx-1.5" style={{ height: "0.5px", background: "linear-gradient(to right, transparent, #6366f1)" }} />
      <span className="rounded-full shrink-0" style={{ width: "3px", height: "3px", background: "#6366f1" }} />
      <span className="flex-1 mx-1.5" style={{ height: "0.5px", background: "linear-gradient(to left, transparent, #6366f1)" }} />
      <span className="w-0.5 h-0.5 rounded-full shrink-0" style={{ background: "#6366f1" }} />
    </div>
  );
}

// Section header ("YOU" / "THEM") with a round colon — two stacked dots
// instead of the typographic ":".
function StepHeader({ word }: { word: string }) {
  return (
    <span
      className="font-bold tracking-widest text-indigo-500 uppercase"
      style={{ fontSize: "max(64px, 8.8vw)", display: "inline-flex", alignItems: "center", gap: "0.22em", lineHeight: 1 }}
    >
      {word}
      <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.16em" }} aria-hidden="true">
        <span style={{ width: "0.17em", height: "0.17em", borderRadius: "9999px", background: "currentColor" }} />
        <span style={{ width: "0.17em", height: "0.17em", borderRadius: "9999px", background: "currentColor" }} />
      </span>
    </span>
  );
}

// Row 1 — what YOU (the business) do to get set up.
const row1: StepData[] = [
  {
    step: "Step 1",
    scale: 1.3125,
    bullets: ["Add your business", "+", "Add Reward"],
    closing: null,
  },
  {
    step: "Step 2",
    scale: 1.3125,
    bullets: ["Choose your free QR display", "SUBTITLE:(It's on us)", "+", "Temporary QR stickers: already on the way"],
    closing: null,
  },
  {
    step: "Step 3",
    scale: 1.125,
    bullets: ["TITLE:There's no step three", "You're good to go"],
    closing: null,
  },
];

// Row 2 — how it actually works (copy TBD; empty placeholders for now).
const row2: StepData[] = [
  {
    step: "Step 1",
    scale: 1.3125,
    bullets: ["User scans QR code, enters name and phone number", "SUBTITLE:(No app)"],
    closing: null,
  },
  {
    step: "Step 2",
    scale: 1.3125,
    bullets: ["Next visit, they scan your QR again", "SUBTITLE:(No login)"],
    closing: null,
  },
  {
    step: "Step 3",
    scale: 1.125,
    bullets: [
      "TITLE:There's no step three",
      "When the customer reaches the preset amount, they show you at checkout",
      "You're good to go",
    ],
    closing: null,
  },
];

// Real brand marks for the trust band — familiarity does the work. Used
// nominatively to signal genuine integration (Apple Wallet, Google Wallet,
// Stripe), each at its official color.
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="#111827" aria-hidden="true">
      <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-1.71-.92-2.82-.9-1.45.02-2.79.84-3.54 2.14-1.51 2.62-.39 6.5 1.08 8.63.72 1.04 1.58 2.21 2.7 2.17 1.08-.04 1.49-.7 2.8-.7 1.31 0 1.68.7 2.82.68 1.17-.02 1.91-1.06 2.62-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.88-2.31-3.47zM14.47 4.5c.6-.72 1-1.73.89-2.73-.86.03-1.9.57-2.51 1.29-.55.64-1.03 1.66-.9 2.64.96.07 1.93-.49 2.52-1.2z"/>
    </svg>
  );
}
function GoogleGMark() {
  return (
    <svg viewBox="0 0 48 48" width="17" height="17" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Strict section-snap on phones only — each circle catches the scroll */}
      <style>{`@media (max-width: 767px){html{scroll-snap-type:y mandatory}}`}</style>
      <RecoveryRedirect />
      <ScrollReset />

      {/* Nav */}
      <nav className="px-6 py-2 flex items-center justify-between w-full" style={{ scrollSnapAlign: "start" }}>
        {/* Logo → home. p-4/-m-4 gives a big tap target without shifting layout. */}
        <Link href="/" aria-label="Punched — home" className="-ml-4 p-4 flex items-center">
          <img src="/punched-only.png" alt="Punched" style={{ height: "clamp(15px, 3.5vw, 20px)", width: "auto" }} />
        </Link>
        <Link
          href="/auth/login"
          className="-mr-4 p-4 font-semibold text-indigo-600 hover:text-indigo-700"
          style={{ fontSize: "clamp(15px, 3.5vw, 20px)" }}
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-16 pb-8">
        <h1
          className="font-extrabold leading-tight tracking-tight mb-5"
          style={{ fontSize: "clamp(16px, 4.5vw, 52px)", whiteSpace: "nowrap" }}
        >
          Nobody carries a punch card.
          <br />
          <span className="text-indigo-600">Everybody carries their phone.</span>
        </h1>

        <div className="flex flex-col items-center" style={{ gap: "6px" }}>
          <span className="text-gray-400" style={{ fontSize: "max(18px, 2.8vw)" }}>•</span>
          <span className="font-semibold text-gray-800" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"Nobody wants to download another app"}
          </span>
          <span className="font-semibold text-indigo-600" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"We made it so they don't have to"}
          </span>
          <span className="text-gray-400" style={{ fontSize: "max(18px, 2.8vw)" }}>•</span>
          <span className="font-semibold text-gray-800" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"No app, No login, No friction"}
          </span>
          <span className="font-semibold text-indigo-600" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"It just works"}
          </span>
        </div>
      </section>

      {/* Small divider between the copy and the YOU: steps */}
      <DotDivider />

      {/* Steps — row 1 (business setup), led by the "YOU:" label (2x) */}
      <section className="flex flex-col items-center gap-4 px-4 pt-4 pb-5">
        <StepHeader word="you" />
        {row1.map((s) => (
          <StepCircle key={s.step} s={s} />
        ))}
      </section>

      {/* Divider before the "how it works" row */}
      <DotDivider />

      {/* Steps — row 2 (how it works for the customer), led by "THEM:" */}
      <section className="flex flex-col items-center gap-4 px-4 py-5">
        <StepHeader word="them" />
        {row2.map((s, i) => (
          <StepCircle key={`r2-${i}`} s={s} />
        ))}
      </section>

      {/* Tiny divider between steps and signup */}
      <div className="flex items-center justify-center w-32 mx-auto py-2">
        <span className="w-0.5 h-0.5 rounded-full shrink-0" style={{ background: "#6366f1" }} />
        <span className="flex-1 mx-1.5" style={{ height: "0.5px", background: "linear-gradient(to right, transparent, #6366f1)" }} />
        <span className="rounded-full shrink-0" style={{ width: "3px", height: "3px", background: "#6366f1" }} />
        <span className="flex-1 mx-1.5" style={{ height: "0.5px", background: "linear-gradient(to left, transparent, #6366f1)" }} />
        <span className="w-0.5 h-0.5 rounded-full shrink-0" style={{ background: "#6366f1" }} />
      </div>

      {/* Trust band — borrowed credibility right before the signup decision.
          The product is so simple it can read as too-good-to-be-true; we answer
          "what's the catch?" with names everyone already trusts, not friction. */}
      <section className="px-6 pt-2 pb-10 flex flex-col items-center text-center" style={{ scrollSnapAlign: "center" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">
          Runs on the most secure platforms in the world
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mb-5">
          <span className="flex items-center gap-2 font-semibold text-gray-800" style={{ fontSize: "clamp(14px, 3.6vw, 17px)" }}>
            <AppleMark /> Apple Wallet
          </span>
          <span className="flex items-center gap-2 font-semibold text-gray-800" style={{ fontSize: "clamp(14px, 3.6vw, 17px)" }}>
            <GoogleGMark /> Google Wallet
          </span>
          <span className="font-semibold" style={{ fontSize: "clamp(14px, 3.6vw, 17px)", color: "#635BFF" }}>
            Stripe
          </span>
        </div>
        <p className="text-gray-500 max-w-md mb-5" style={{ fontSize: "clamp(13px, 3.4vw, 15px)", lineHeight: 1.6 }}>
          Cards live in <span className="font-medium text-gray-700">Apple Wallet</span> &amp;{" "}
          <span className="font-medium text-gray-700">Google Wallet</span>. Payments run on{" "}
          <span className="font-medium text-gray-700">Stripe</span>. Plus fraud protection and
          security hardening most loyalty tools never bother with.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          <span className="font-semibold text-indigo-700" style={{ fontSize: "clamp(13px, 3.4vw, 15px)" }}>
            No contracts. Cancel anytime.
          </span>
        </div>
      </section>

      {/* Signup */}
      <section className="px-6 pt-4 pb-20 flex flex-col items-center gap-6" style={{ scrollSnapAlign: "center" }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-400">Set up your loyalty program in under <span className="num">60</span> seconds.</p>
        </div>
        <HeroSignupForm />
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-gray-400">
        <span className="whitespace-nowrap" style={{ fontSize: "clamp(10px, 3vw, 14px)" }}>
          © <span className="num">{new Date().getFullYear()}</span> Punched.me. Built for dope businesses.
        </span>
      </footer>
    </div>
  );
}
