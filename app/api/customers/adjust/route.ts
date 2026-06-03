import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify owner is authenticated
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, programId, punchesDelta, reason } = body as {
      customerId: string;
      programId: string;
      punchesDelta: number;
      reason: string;
    };

    if (!customerId || !programId || punchesDelta === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify the customer belongs to a business owned by this user
    const { data: customer } = await db
      .from("customers")
      .select("id, business_id, businesses!inner(owner_user_id)")
      .eq("id", customerId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const biz = customer.businesses as unknown as { owner_user_id: string };
    if (biz.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch current account
    const { data: account } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", customerId)
      .eq("program_id", programId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const newPunches = Math.max(0, account.current_punches + punchesDelta);

    await db
      .from("loyalty_accounts")
      .update({ current_punches: newPunches })
      .eq("id", account.id);

    // Log event
    await db.from("scan_events").insert({
      business_id: customer.business_id,
      customer_id: customerId,
      program_id: programId,
      staff_user_id: user.id,
      event_type: "manual_adjustment",
      punches_delta: punchesDelta,
      metadata: { reason, previous: account.current_punches, new: newPunches },
    });

    return NextResponse.json({ ok: true, currentPunches: newPunches });
  } catch (err) {
    console.error("Adjust error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
