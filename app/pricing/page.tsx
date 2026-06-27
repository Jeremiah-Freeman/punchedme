import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = {
  title: "Pricing — Punched",
  description: "Start free. Pay when your rewards program is actually working.",
};

type Tier = {
  name: string;
  price: string;
  per?: string;
  cap: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  note?: string;
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    per: "/month",
    cap: "Up to 50 reward members",
    blurb: "Everything you need to start. No card required.",
    features: [
      "QR code ready instantly",
      "Free QR sticker pack mailed to you",
      "No app, no login for customers",
      "Basic fraud protection",
    ],
    cta: "Start free",
    href: "/onboarding",
  },
  {
    name: "Starter",
    price: "$19.99",
    per: "/month",
    cap: "Up to 200 reward members",
    blurb: "For when customers are actually joining.",
    features: [
      "Everything in Free",
      "Your counter display, included",
      "Reward dashboard + analytics",
      "Fraud controls (radius + cooldown)",
    ],
    cta: "Get started",
    href: "/onboarding",
    featured: true,
    note: "Counter display ships after your first paid month — or today if you choose Ship My Display Now.",
  },
  {
    name: "Growth",
    price: "$55",
    per: "/month",
    cap: "Up to 1,000 reward members",
    blurb: "For shops with a real following.",
    features: [
      "Everything in Starter",
      "Deeper reward analytics",
      "More reward flexibility",
      "Room to grow your member base",
    ],
    cta: "Get started",
    href: "/onboarding",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav — matches the landing */}
      <nav className="px-6 py-2 flex items-center justify-between w-full">
        <Link href="/" aria-label="Punched — home" className="-ml-4 p-4 flex items-center">
          <img src="/punched-only.png" alt="Punched" style={{ height: "clamp(14px, 3.2vw, 18px)", width: "auto" }} />
        </Link>
        <Link href="/auth/login" className="-mr-4 p-4 text-gray-600 hover:text-gray-900" style={{ fontSize: "clamp(14px, 3.2vw, 18px)" }}>
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-12 pb-8 max-w-2xl mx-auto">
        <h1 className="font-extrabold tracking-tight text-gray-900 mb-4" style={{ fontSize: "clamp(28px, 7vw, 48px)" }}>
          Start free.{" "}
          <span className="text-indigo-600">Pay when it&apos;s working.</span>
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Get your QR code instantly and your sticker pack in the mail. You only pay
          once 50 reward members have joined — or whenever you want your counter
          display on the counter.
        </p>
      </section>

      {/* Tiers */}
      <section className="px-6 pb-16 max-w-5xl mx-auto grid gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-3xl p-7 flex flex-col ${
              t.featured
                ? "bg-indigo-600 text-white shadow-xl md:-translate-y-2"
                : "bg-white text-gray-900 border border-gray-200 shadow-sm"
            }`}
          >
            {t.featured && (
              <span className="self-start text-xs font-semibold uppercase tracking-wide bg-white/20 rounded-full px-3 py-1 mb-3">
                Most popular
              </span>
            )}
            <h2 className={`text-xl font-bold mb-1 ${t.featured ? "text-white" : "text-gray-900"}`}>{t.name}</h2>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-extrabold">{t.price}</span>
              <span className={`mb-1 text-sm ${t.featured ? "text-indigo-100" : "text-gray-400"}`}>{t.per}</span>
            </div>
            <p className={`text-sm font-semibold mb-1 ${t.featured ? "text-indigo-50" : "text-indigo-600"}`}>{t.cap}</p>
            <p className={`text-sm mb-5 ${t.featured ? "text-indigo-100" : "text-gray-500"}`}>{t.blurb}</p>

            <ul className="space-y-2.5 mb-6 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${t.featured ? "text-white" : "text-indigo-500"}`} />
                  <span className={t.featured ? "text-indigo-50" : "text-gray-700"}>{f}</span>
                </li>
              ))}
            </ul>

            {t.note && (
              <p className={`text-xs mb-4 leading-relaxed ${t.featured ? "text-indigo-100" : "text-gray-400"}`}>{t.note}</p>
            )}

            <Link
              href={t.href}
              className={`block text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                t.featured
                  ? "bg-white text-indigo-700 hover:bg-indigo-50"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* Reassurance */}
      <section className="px-6 pb-20 text-center">
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          No card to start. No paper punch cards. No app for your customers — they
          just scan. Cancel anytime.
        </p>
      </section>
    </div>
  );
}
