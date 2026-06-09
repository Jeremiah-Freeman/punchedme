import Link from "next/link";
import RecoveryRedirect from "./RecoveryRedirect";
import HeroSignupForm from "./HeroSignupForm";

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
      <section className="text-center px-6 pt-16 pb-10">
        <h1 className="font-extrabold leading-tight tracking-tight mb-4"
          style={{ fontSize: "clamp(17px, 4.5vw, 52px)", whiteSpace: "nowrap" }}>
          Digital punch cards<br />
          <span className="text-indigo-600">without the stupid...punch cards</span>
        </h1>
        <div className="flex flex-col items-center" style={{ gap: "3px" }}>
          <span className="font-semibold text-gray-800" style={{ fontSize: "clamp(18px, 3.5vw, 42px)", whiteSpace: "nowrap" }}>
            Customers scan a QR code
          </span>
          <span className="text-gray-500" style={{ fontSize: "clamp(11px, 2.1vw, 25px)", whiteSpace: "nowrap" }}>
            • No app &nbsp;•&nbsp; No login &nbsp;•&nbsp; No friction
          </span>
        </div>
      </section>

      {/* Steps */}
      <section className="flex flex-col items-center gap-8 px-4 py-10">
        {[
          {
            step: "Step 1",
            alignTop: true,
            noSeparator: true,
            noBullets: true,
            bullets: ["Add your business", "•", "Add Reward", "", ""] as string[],
            closing: "That's it",
          },
          {
            step: "Step 2",
            alignTop: true,
            noSeparator: true,
            noBullets: true,
            bullets: ["Choose your free QR display", "SUBTITLE:(We got you)", "•", ""] as string[],
            closing: "You're done",
          },
          {
            step: "Step 3",
            alignTop: true,
            noSeparator: true,
            noBullets: true,
            bullets: ["TITLE:There's no step three", "You're good to go", "•", "Your customers do the work for you", "", "Your QR code is on the way"] as string[],
            closing: null as string | null,
          },
        ].map((s) => (
          <div
            key={s.step}
            className="relative rounded-full border-2 border-indigo-400 flex flex-col items-center justify-center text-center w-full"
            style={{
              aspectRatio: "1",
              padding: "clamp(32px, 7vw, 160px)",
            }}
          >
            <p style={{ position: "absolute", top: "max(60px, 12vw)", fontSize: "max(32px, 4.4vw)" }} className="font-bold tracking-widest text-indigo-500 uppercase">
              {s.step.replace(/\d+/, "")}
              <span className="num" style={{ fontWeight: 300, WebkitTextStroke: "0.4px currentColor" }}>{s.step.match(/\d+/)?.[0]}</span>
            </p>
            {s.bullets ? (
              <div className="flex flex-col items-center" style={{ gap: "max(8px, 1vw)" }}>
                {s.bullets.map((b, i) =>
                  b === "" ? (
                    <div key={i} style={{ height: "max(10px, 1.2vw)" }} />
                  ) : b === "•" ? (
                    <p key={i} style={{ fontSize: "max(18px, 2.8vw)" }} className="text-gray-400">•</p>
                  ) : b.startsWith("SUBTITLE:") ? (
                    <p key={i} style={{ fontSize: "max(16px, 2.4vw)", lineHeight: 1.5 }} className="text-gray-400">{b.replace("SUBTITLE:", "")}</p>
                  ) : b.startsWith("TITLE:") ? (
                    <p key={i} style={{ fontSize: "max(24px, 3.6vw)", lineHeight: 1.2, marginBottom: "max(6px, 0.8vw)" }} className="font-bold text-gray-900">{b.replace("TITLE:", "")}</p>
                  ) : (
                    <p key={i} style={{ fontSize: "max(18px, 2.8vw)", lineHeight: 1.5 }} className="text-gray-700">{s.noBullets ? "" : "• "}{b}</p>
                  )
                )}
                {!s.noSeparator && (
                  <p style={{ fontSize: "max(18px, 2.8vw)" }} className="text-gray-400">•</p>
                )}
                {s.closing && <p style={{ fontSize: "max(18px, 2.8vw)", lineHeight: 1.5 }} className="font-semibold text-gray-900">{s.closing}</p>}
              </div>
            ) : null}
          </div>
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
      <footer className="border-t py-8 px-6 text-center text-sm text-gray-400">
        © <span className="num">{new Date().getFullYear()}</span> Punched.me. Built for dope businesses.
      </footer>
    </div>
  );
}
