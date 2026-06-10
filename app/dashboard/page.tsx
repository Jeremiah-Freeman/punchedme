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

  const stats = [
    { label: "Total customers", value: totalCustomers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
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
