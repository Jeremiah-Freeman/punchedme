import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, programId } = body as {
      customerId: string;
      programId: string;
    };

    if (!customerId || !programId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();

    // Get program
    const { data: program } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("id", programId)
      .single();

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Get account
    const { data: account } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", customerId)
      .eq("program_id", programId)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (account.current_punches < program.punches_required) {
      return NextResponse.json(
        { error: "Not enough punches to redeem" },
        { status: 400 }
      );
    }

    // Subtract model: deduct required punches, keep the rest
    const newPunches = account.current_punches - program.punches_required;

    await db
      .from("loyalty_accounts")
      .update({
        current_punches: newPunches,
        rewards_redeemed: account.rewards_redeemed + 1,
      })
      .eq("id", account.id);

    // Get customer for business_id
    const { data: customer } = await db
      .from("customers")
      .select("business_id, first_name")
      .eq("id", customerId)
      .single();

    // Log redemption event
    await db.from("scan_events").insert({
      business_id: customer?.business_id,
      customer_id: customerId,
      program_id: programId,
      event_type: "reward_redeemed",
      punches_delta: -program.punches_required,
      metadata: {
        reward_name: program.reward_name,
        previous_punches: account.current_punches,
        new_punches: newPunches,
      },
    });

    return NextResponse.json({
      ok: true,
      rewardName: program.reward_name,
      newPunches,
      customerName: customer?.first_name ?? "",
    });
  } catch (err) {
    console.error("Redeem error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
