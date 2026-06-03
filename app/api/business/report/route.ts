import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("*")
      .eq("owner_user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const { data: program } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .single();

    const { data: customers } = await db
      .from("customers")
      .select("id, first_name, phone_number, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    const { data: accounts } = await db
      .from("loyalty_accounts")
      .select("customer_id, current_punches, lifetime_punches, rewards_earned, rewards_redeemed")
      .in("customer_id", (customers ?? []).map((c) => c.id));

    const accountMap = new Map((accounts ?? []).map((a) => [a.customer_id, a]));

    // Build CSV
    const rows = [
      ["Business Report", business.name],
      ["Generated", new Date().toLocaleString()],
      ["Program", program?.reward_name ?? "No active program"],
      ["Visits for reward", program?.punches_required ?? "—"],
      [],
      ["Customer Name", "Phone", "Current Punches", "Lifetime Visits", "Rewards Earned", "Rewards Redeemed", "Joined"],
      ...(customers ?? []).map((c) => {
        const acct = accountMap.get(c.id);
        return [
          c.first_name,
          c.phone_number,
          acct?.current_punches ?? 0,
          acct?.lifetime_punches ?? 0,
          acct?.rewards_earned ?? 0,
          acct?.rewards_redeemed ?? 0,
          new Date(c.created_at).toLocaleDateString(),
        ];
      }),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const filename = `${business.name.replace(/[^a-z0-9]/gi, "_")}_report_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
