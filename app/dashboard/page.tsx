import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Star, Zap, ArrowRight, Download } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .single();

  // Stats
  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: punchesToday } = await supabase
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .in("event_type", ["punch_added", "reward_earned"])
    .gte("created_at", today.toISOString());

  const { count: rewardsRedeemed } = await supabase
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("event_type", "reward_redeemed");

  // Recent scan events
  const { data: recentEvents } = await supabase
    .from("scan_events")
    .select("*, customers(first_name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // ── Plan milestone state (member_count is derived from customers) ──
  const memberCount = totalCustomers ?? 0;
  const FREE_CAP = 50;
  const STARTER_CAP = 200;
  const planType: string = business.plan_type ?? "free";
  const paid = business.payment_status === "active" || planType !== "free";
  const displayLabels: Record<string, string> = {
    sticker: "sticker pack",
    acrylic: "clear acrylic display",
    bamboo: "bamboo display",
    black: "minimal black display",
    dynamic: "dynamic display",
  };
  const displayLabel = displayLabels[business.selected_display_type as string] ?? "counter display";
  let milestone: "free_active" | "free_near_limit" | "free_limit_reached_no_payment" | "starter_active" | "growth_required";
  if (paid && planType === "starter" && memberCount > STARTER_CAP) milestone = "growth_required";
  else if (paid) milestone = "starter_active";
  else if (memberCount >= FREE_CAP) milestone = "free_limit_reached_no_payment";
  else if (memberCount >= 40) milestone = "free_near_limit";
  else milestone = "free_active";
  const remaining = Math.max(0, FREE_CAP - memberCount);
  const pct = Math.min(100, Math.round((memberCount / FREE_CAP) * 100));

  const stats = [
    { label: "Reward members", value: totalCustomers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Punches today", value: punchesToday ?? 0, icon: Zap, color: "text-indigo-600 bg-indigo-50" },
    { label: "Rewards redeemed", value: rewardsRedeemed ?? 0, icon: Star, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {program
              ? `${program.reward_name} after ${program.punches_required} visits`
              : "No active program"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/business/report"
            download
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export report
          </a>
          <Link
            href="/dashboard/scan"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Scan Mode <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Plan milestone */}
      <MilestoneCard
        milestone={milestone}
        memberCount={memberCount}
        remaining={remaining}
        pct={pct}
        freeCap={FREE_CAP}
        displayLabel={displayLabel}
        displayStatus={(business.display_status as string) ?? "selected"}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {!program && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-900">No loyalty program yet</p>
            <p className="text-sm text-amber-700 mt-0.5">Set one up to start accepting customers.</p>
          </div>
          <Link
            href="/dashboard/program"
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            Set up program
          </Link>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent activity</h2>
          <Link href="/dashboard/customers" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {recentEvents && recentEvents.length > 0 ? (
          <div className="divide-y">
            {recentEvents.map((event) => {
              const customer = event.customers as unknown as { first_name: string } | null;
              return (
                <div key={event.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EventBadge type={event.event_type} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer?.first_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">{formatEventType(event.event_type)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            No activity yet. Share your join link to get started!
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-white/50 rounded-full h-2.5 overflow-hidden">
      <div className="bg-indigo-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MilestoneCard({
  milestone,
  memberCount,
  remaining,
  pct,
  freeCap,
  displayLabel,
  displayStatus,
}: {
  milestone: string;
  memberCount: number;
  remaining: number;
  pct: number;
  freeCap: number;
  displayLabel: string;
  displayStatus: string;
}) {
  // free_active — building toward the unlock
  if (milestone === "free_active") {
    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-gray-900">You&apos;re live. 🎉</p>
        <p className="text-sm text-gray-600 mt-0.5 mb-4">Share your QR at checkout and start building your reward members.</p>
        <ProgressBar pct={pct} />
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold text-indigo-700">{memberCount} / {freeCap}</span> reward members until your {displayLabel} unlocks.
        </p>
      </div>
    );
  }

  // free_near_limit — nudge to add payment so the display ships automatically
  if (milestone === "free_near_limit") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-amber-900">You&apos;re almost there</p>
        <p className="text-sm text-amber-800 mt-0.5 mb-4">Only {remaining} more reward {remaining === 1 ? "member" : "members"} until your {displayLabel} unlocks.</p>
        <ProgressBar pct={pct} />
        <p className="text-xs text-amber-700 mt-2 mb-4">{memberCount} / {freeCap} reward members</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Add payment so it ships automatically
          </Link>
        </div>
      </div>
    );
  }

  // free_limit_reached_no_payment — milestone hit, activate to keep growing
  if (milestone === "free_limit_reached_no_payment") {
    return (
      <div className="bg-indigo-600 text-white rounded-2xl p-6 mb-8">
        <p className="text-xl font-bold">You did it — {memberCount} reward members 🎉</p>
        <p className="text-sm text-indigo-100 mt-1 mb-4">Activate Starter to keep growing past {freeCap} members and ship your {displayLabel}. Your existing members keep earning either way.</p>
        <Link href="/pricing" className="inline-block bg-white text-indigo-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors">
          Activate Starter
        </Link>
      </div>
    );
  }

  // starter_active — display being prepared
  if (milestone === "starter_active") {
    const statusLabel: Record<string, string> = {
      selected: "queued",
      pending_payment: "awaiting payment",
      preparing: "being prepared",
      shipped: "on its way 📦",
      delivered: "delivered ✅",
    };
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-8">
        <p className="font-semibold text-green-900">Starter is active.</p>
        <p className="text-sm text-green-800 mt-0.5">Your {displayLabel} is {statusLabel[displayStatus] ?? "being prepared"}.</p>
      </div>
    );
  }

  // growth_required — outgrew Starter
  return (
    <div className="bg-indigo-600 text-white rounded-2xl p-6 mb-8">
      <p className="text-lg font-bold">You&apos;ve outgrown Starter</p>
      <p className="text-sm text-indigo-100 mt-1 mb-4">Upgrade to Growth to keep accepting new reward members.</p>
      <Link href="/pricing" className="inline-block bg-white text-indigo-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors">
        Upgrade to Growth
      </Link>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    punch_added: "bg-indigo-100 text-indigo-700",
    reward_earned: "bg-amber-100 text-amber-700",
    reward_redeemed: "bg-green-100 text-green-700",
    manual_adjustment: "bg-gray-100 text-gray-700",
    blocked: "bg-red-100 text-red-700",
    undo: "bg-orange-100 text-orange-700",
  };
  const icons: Record<string, string> = {
    punch_added: "👊",
    reward_earned: "🎉",
    reward_redeemed: "✅",
    manual_adjustment: "✏️",
    blocked: "🚫",
    undo: "↩️",
  };
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${styles[type] ?? "bg-gray-100"}`}>
      {icons[type] ?? "·"}
    </div>
  );
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    punch_added: "Punch added",
    reward_earned: "Reward earned",
    reward_redeemed: "Reward redeemed",
    manual_adjustment: "Manual adjustment",
    blocked: "Scan blocked (cooldown)",
    undo: "Scan undone",
  };
  return map[type] ?? type;
}
