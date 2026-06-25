import Link from "next/link";
import RecoveryRedirect from "./RecoveryRedirect";
import HeroSignupForm from "./HeroSignupForm";

// Build a responsive font-size, optionally scaled. Mirrors the original
// `max(<px>, <vw>)` pattern so a circle's whole text block can grow together.
function fs(px: number, vw: number, scale = 1): string {
  return `max(${Math.round(px * scale)}px, ${(vw * scale).toFixed(2)}vw)`;
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
      style={{ aspectRatio: "1", padding: "clamp(32px, 7vw, 160px)" }}
    >
      {/* STEP label — pinned near the top, nudged up from the old position */}
      <p
        style={{ position: "absolute", top: s.labelTop ?? "max(40px, 8vw)", fontSize: "max(32px, 4.4vw)" }}
        className="font-bold tracking-widest text-indigo-500 uppercase"
      >
        {s.step.replace(/\d+/, "")}
        <span className="num" style={{ fontWeight: 300, WebkitTextStroke: "0.4px currentColor" }}>
          {s.step.match(/\d+/)?.[0]}
        </span>
      </p>

      <div className="flex flex-col items-center" style={{ gap: fs(8, 1, k) }}>
        {s.bullets.map((b, i) =>
          b === "" ? (
            <div key={i} style={{ height: fs(10, 1.2, k) }} />
          ) : b === "+" ? (
            <p key={i} style={{ fontSize: "max(36px, 4.5vw)", fontWeight: 200, lineHeight: 1 }} className="text-gray-900">
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
    <div className="flex items-center px-6 max-w-6xl mx-auto my-12">
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#6366f1" }} />
      <span className="flex-1 h-px mx-2" style={{ background: "linear-gradient(to right, transparent, #6366f1)" }} />
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#6366f1" }} />
      <span className="flex-1 h-px mx-2" style={{ background: "linear-gradient(to left, transparent, #6366f1)" }} />
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#6366f1" }} />
    </div>
  );
}

// Row 1 — what YOU (the business) do to get set up.
const row1: StepData[] = [
  {
    step: "Step 1",
    scale: 1.3125,
    bullets: ["", "Add your business", "+", "Add Reward", ""],
    closing: "That's it",
  },
  {
    step: "Step 2",
    scale: 1.3125,
    bullets: ["", "Choose your free QR display", "SUBTITLE:(It's on us)", "+", "temporary QR stickers: already on the way", ""],
    closing: "You're done",
  },
  {
    step: "Step 3",
    scale: 1.125,
    bullets: ["", "TITLE:There's no step three", "You're good to go", ""],
    closing: null,
  },
];

// Row 2 — how it actually works (copy TBD; empty placeholders for now).
const row2: StepData[] = [
  { step: "Step 1", scale: 1.5, bullets: [] },
  { step: "Step 2", scale: 1.5, bullets: [] },
  { step: "Step 3", scale: 1.5, bullets: [] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <RecoveryRedirect />

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between w-full">
        <img src="/punched-only.png" alt="Punched" style={{ height: "clamp(20px, 3.5vw, 32px)", width: "auto" }} />
        <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
          Log in
        </Link>
      </nav>
      <div className="flex items-center px-6 max-w-6xl mx-auto">
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#6366f1" }} />
        <span className="flex-1 h-px mx-2" style={{ background: "linear-gradient(to right, transparent, #6366f1)" }} />
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#6366f1" }} />
        <span className="flex-1 h-px mx-2" style={{ background: "linear-gradient(to left, transparent, #6366f1)" }} />
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#6366f1" }} />
      </div>

      {/* Hero */}
      <section className="text-center px-6 pt-16 pb-20">
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
            {"we made it so they don't have to"}
          </span>
          <span className="text-gray-400" style={{ fontSize: "max(18px, 2.8vw)" }}>•</span>
          <span className="font-semibold text-gray-800" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"No app, no login, no friction"}
          </span>
          <span className="font-semibold text-gray-800" style={{ fontSize: "clamp(15px, 4.4vw, 34px)", whiteSpace: "nowrap" }}>
            {"it just works"}
          </span>
        </div>
      </section>

      {/* Steps — row 1 (business setup), led by the "YOU:" label */}
      <section className="flex flex-col items-center gap-8 px-4 pt-8 pb-10">
        <span
          className="font-bold tracking-widest text-indigo-500 uppercase"
          style={{ fontSize: "max(32px, 4.4vw)" }}
        >
          you:
        </span>
        {row1.map((s) => (
          <StepCircle key={s.step} s={s} />
        ))}
      </section>

      {/* Divider before the "how it works" row */}
      <DotDivider />

      {/* Steps — row 2 (how it works; placeholders to fill in) */}
      <section className="flex flex-col items-center gap-8 px-4 py-10">
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

      {/* Signup */}
      <section className="px-6 pt-4 pb-20 flex flex-col items-center gap-6">
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
