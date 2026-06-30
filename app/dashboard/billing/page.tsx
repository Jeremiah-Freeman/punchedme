import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { PlanCheckoutButton } from "../PlanCheckoutButton";
import { PortalButton } from "../PortalButton";

const PLANS: Record<string, { name: string; price: string; cap: number; blurb: string; features: string[] }> = {
  free: {
    name: "Free",
    price: "$0",
    cap: 50,
    blurb: "Everything to start. No card required.",
    features: ["QR code ready instantly", "Free QR sticker pack", "Up to 50 reward members"],
  },
  starter: {
    name: "Starter",
    price: "$19.99",
    cap: 200,
    blurb: "For when customers are actually joining.",
    features: ["Your counter display, included", "Up to 200 reward members", "Reward dashboard + analytics", "Fraud controls"],
  },
  growth: {
    name: "Growth",
    price: "$55",
    cap: 1000,
    blurb: "For shops with a real following.",
    features: ["Everything in Starter", "Up to 1,000 reward members", "Deeper analytics", "More reward flexibility"],
  },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { switched?: string; checkout?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();
  if (!business) redirect("/onboarding");

  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  const memberCount = count ?? 0;

  const planType: string = business.plan_type ?? "free";
  const paid = business.payment_status === "active" || planType !== "free";
  const pastDue = business.payment_status === "past_due";
  const hasBilling = !!business.stripe_customer_id;
  const current = PLANS[planType] ?? PLANS.free;
  const usagePct = Math.min(100, Math.round((memberCount / current.cap) * 100));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan &amp; Billing</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your plan, payment, and reward-member limit.</p>
      </div>

      {/* Plan switched confirmation */}
      {searchParams?.switched === "1" && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 mb-6 text-sm font-medium">
          ✅ Plan updated. The change is effective now and prorated on your next invoice.
        </div>
      )}

      {/* Past-due warning */}
      {pastDue && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
          <p className="font-semibold text-red-900">Your last payment failed</p>
          <p className="text-sm text-red-800 mt-0.5 mb-3">Update your card to keep your plan active and avoid losing access past the free limit.</p>
          <PortalButton
            label="Update payment method"
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          />
        </div>
      )}

      {/* Current plan */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Current plan</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {current.name} <span className="text-base font-medium text-gray-400">{current.price}{planType !== "free" ? "/mo" : ""}</span>
            </p>
          </div>
          {pastDue ? (
            <span className="text-xs font-semibold bg-red-100 text-red-700 rounded-full px-3 py-1">Payment past due</span>
          ) : paid ? (
            <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1">Active</span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 rounded-full px-3 py-1">Free</span>
          )}
        </div>

        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-600">Reward members</span>
          <span className="font-semibold text-gray-900">{memberCount} / {current.cap}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${usagePct}%` }} />
        </div>

        {hasBilling && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <PortalButton
              label="Manage billing — update card, invoices, or cancel"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {/* Upgrade options */}
      {planType === "growth" ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
          <p className="font-semibold text-gray-900">You&apos;re on our top plan. 🎉</p>
          <p className="text-sm text-gray-600 mt-0.5">Need more than 1,000 reward members? Email <a href="mailto:hello@punched.me" className="text-indigo-600 underline">hello@punched.me</a>.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{planType === "free" ? "Upgrade your plan" : "Grow further"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(planType === "free" ? ["starter", "growth"] : ["growth"]).map((key) => {
              const p = PLANS[key];
              const featured = key === "starter";
              return (
                <div key={key} className={`rounded-2xl p-6 flex flex-col border ${featured ? "border-2 border-indigo-500" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                    {featured && <span className="text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">Popular</span>}
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 mb-1">{p.price}<span className="text-sm font-medium text-gray-400">/mo</span></p>
                  <p className="text-xs text-gray-500 mb-4">{p.blurb}</p>
                  <ul className="space-y-2 text-sm text-gray-700 mb-5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2"><Check className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <PlanCheckoutButton
                    plan={key as "starter" | "growth"}
                    label={`Upgrade to ${p.name}`}
                    className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${featured ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-900 text-white hover:bg-black"}`}
                  />
                </div>
              );
            })}
          </div>
          {planType !== "free" && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Switching plans prorates automatically through Stripe.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
