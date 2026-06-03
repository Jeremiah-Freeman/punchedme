import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "No business" }, { status: 404 });
    }

    const { data: program } = await db
      .from("loyalty_programs")
      .select("id, punches_required")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .single();

    const { data: customers } = await db
      .from("customers")
      .select("id, first_name, phone_number, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (!customers || !program) {
      return NextResponse.json({ customers: [] });
    }

    // Get loyalty accounts
    const customerIds = customers.map((c) => c.id);

    const { data: accounts } = await db
      .from("loyalty_accounts")
      .select("customer_id, current_punches, lifetime_punches, rewards_earned, rewards_redeemed")
      .in("customer_id", customerIds)
      .eq("program_id", program.id);

    // Get last visit per customer
    const { data: lastVisits } = await db
      .from("scan_events")
      .select("customer_id, created_at")
      .in("customer_id", customerIds)
      .in("event_type", ["punch_added", "reward_earned"])
      .order("created_at", { ascending: false });

    const accountMap = new Map(accounts?.map((a) => [a.customer_id, a]) ?? []);
    const lastVisitMap = new Map<string, string>();
    lastVisits?.forEach((v) => {
      if (!lastVisitMap.has(v.customer_id)) {
        lastVisitMap.set(v.customer_id, v.created_at);
      }
    });

    const rows = customers.map((c) => {
      const acct = accountMap.get(c.id);
      return {
        id: c.id,
        first_name: c.first_name,
        phone_number: c.phone_number,
        created_at: c.created_at,
        program_id: program.id,
        punches_required: program.punches_required,
        current_punches: acct?.current_punches ?? 0,
        lifetime_punches: acct?.lifetime_punches ?? 0,
        rewards_earned: acct?.rewards_earned ?? 0,
        rewards_redeemed: acct?.rewards_redeemed ?? 0,
        last_visit: lastVisitMap.get(c.id) ?? null,
      };
    });

    return NextResponse.json({ customers: rows });
  } catch (err) {
    console.error("List customers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
