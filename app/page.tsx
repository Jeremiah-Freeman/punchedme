import Link from "next/link";
import { ArrowRight, Smartphone, QrCode, Star, Zap } from "lucide-react";
import RecoveryRedirect from "./RecoveryRedirect";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Forwards misrouted password-reset links to /auth/reset-password */}
      <RecoveryRedirect />
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="flex items-center gap-2.5">
          <Logo size={40} />
          <span className="font-bold text-xl tracking-tight">Punched</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Punch In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full mb-8">
          <Zap className="w-3.5 h-3.5" />
          No app. No hardware. No nonsense.
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
          Digital punch cards
          <br />
          <span className="text-indigo-600">without the stupid card.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Replace paper punch cards with Apple Wallet and Google Wallet passes.
          Customers scan a QR code — no app, no account, no friction.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Punch In <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500">Free for your first 40 customers — no credit card to start</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-center text-gray-600 mb-16">Two steps. That&apos;s the whole thing.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Star className="w-8 h-8 text-indigo-600" />,
                title: "1. Answer two questions",
                desc: "What's the reward, and how many visits earns it. That's your whole loyalty program.",
              },
              {
                icon: <QrCode className="w-8 h-8 text-indigo-600" />,
                title: "2. Set your QR by the register",
                desc: "Pick your free QR display — we ship it to you, free. Set it on the counter.",
              },
              {
                icon: <Smartphone className="w-8 h-8 text-indigo-600" />,
                title: "3. There's no step 3",
                desc: "That's it, you're good to go. Your customers do the work. They scan. You earn repeat customers.",
              },
            ].map((step) => (
              <div key={step.title} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything you need, nothing you don&apos;t</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Apple Wallet & Google Wallet", desc: "Real passes that live on the phone. No separate app." },
            { title: "Anti-abuse cooldown", desc: "Prevent customers from gaming the system with rapid repeat scans." },
            { title: "USB barcode scanner support", desc: "Works with any USB scanner plugged into any device. No special hardware." },
            { title: "Full audit trail", desc: "Every punch, redemption, and adjustment is logged forever." },
            { title: "CSV export", desc: "Your customer data is yours. Export anytime." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
              <div className="mt-0.5 text-indigo-600 font-bold text-lg">✓</div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
                <div className="text-sm text-gray-600">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 text-white py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to go cardless?</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">
          Set up your loyalty program in less than 60 seconds. Your first customer visit can happen today.
        </p>
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-50 transition-colors"
        >
          Punch In <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Punched.me. Built for dope businesses.
      </footer>
    </div>
  );
}
