import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScanResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scannedToken, businessId } = body as {
      scannedToken: string;
      businessId: string;
    };

    if (!scannedToken || !businessId) {
      return NextResponse.json(
        { error: "Missing scannedToken or businessId" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Look up customer by token
    const { data: customer } = await db
      .from("customers")
      .select("id, first_name, business_id, public_token")
      .eq("public_token", scannedToken)
      .single();

    if (!customer) {
      return NextResponse.json<ScanResult>({
        status: "invalid",
        customerName: "",
        currentPunches: 0,
        punchesRequired: 0,
        rewardAvailable: false,
        message: "Invalid pass.",
      });
    }

    // Ensure token belongs to the scanned business
    if (customer.business_id !== businessId) {
      return NextResponse.json<ScanResult>({
        status: "invalid",
        customerName: customer.first_name,
        currentPunches: 0,
        punchesRequired: 0,
        rewardAvailable: false,
        message: "Pass does not belong to this business.",
      });
    }

    // Get active program
    const { data: program } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!program) {
      return NextResponse.json<ScanResult>({
        status: "invalid",
        customerName: customer.first_name,
        currentPunches: 0,
        punchesRequired: 0,
        rewardAvailable: false,
        message: "No active loyalty program.",
      });
    }

    // Get or create loyalty account
    let { data: account } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("program_id", program.id)
      .single();

    if (!account) {
      const { data: newAccount } = await db
        .from("loyalty_accounts")
        .insert({
          customer_id: customer.id,
          program_id: program.id,
          current_punches: 0,
          lifetime_punches: 0,
          rewards_earned: 0,
          rewards_redeemed: 0,
        })
        .select()
        .single();
      account = newAccount;
    }

    if (!account) {
      return NextResponse.json({ error: "Account error" }, { status: 500 });
    }

    // Check if reward is already available (before adding punch)
    if (account.current_punches >= program.punches_required) {
      return NextResponse.json<ScanResult>({
        status: "reward_available",
        customerName: customer.first_name,
        currentPunches: account.current_punches,
        punchesRequired: program.punches_required,
        rewardAvailable: true,
        message: `Reward available. ${customer.first_name} has ${account.current_punches}/${program.punches_required}. ${program.reward_name} ready to redeem!`,
        customerId: customer.id,
        programId: program.id,
      });
    }

    // Check cooldown
    if (program.punch_cooldown_minutes > 0) {
      const { data: lastPunch } = await db
        .from("scan_events")
        .select("created_at")
        .eq("customer_id", customer.id)
        .eq("program_id", program.id)
        .eq("event_type", "punch_added")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastPunch) {
        const lastTime = new Date(lastPunch.created_at).getTime();
        const cooldownMs = program.punch_cooldown_minutes * 60 * 1000;
        const elapsed = Date.now() - lastTime;

        if (elapsed < cooldownMs) {
          const minutesRemaining = Math.ceil((cooldownMs - elapsed) / 60000);
          return NextResponse.json<ScanResult>({
            status: "blocked",
            customerName: customer.first_name,
            currentPunches: account.current_punches,
            punchesRequired: program.punches_required,
            rewardAvailable: false,
            message: `Already punched recently. Next punch available in ${formatRemaining(minutesRemaining)}.`,
            cooldownMinutesRemaining: minutesRemaining,
          });
        }
      }
    }

    // Add punch
    const newPunches = account.current_punches + 1;
    const rewardEarned = newPunches >= program.punches_required;

    await db
      .from("loyalty_accounts")
      .update({
        current_punches: newPunches,
        lifetime_punches: account.lifetime_punches + 1,
        ...(rewardEarned ? { rewards_earned: account.rewards_earned + 1 } : {}),
      })
      .eq("id", account.id);

    // Log event
    await db.from("scan_events").insert({
      business_id: businessId,
      customer_id: customer.id,
      program_id: program.id,
      event_type: rewardEarned ? "reward_earned" : "punch_added",
      punches_delta: 1,
      metadata: {
        previous_punches: account.current_punches,
        new_punches: newPunches,
      },
    });

    if (rewardEarned) {
      return NextResponse.json<ScanResult>({
        status: "reward_available",
        customerName: customer.first_name,
        currentPunches: newPunches,
        punchesRequired: program.punches_required,
        rewardAvailable: true,
        message: `Reward earned! ${customer.first_name} has ${newPunches}/${program.punches_required}. ${program.reward_name} available!`,
        customerId: customer.id,
        programId: program.id,
      });
    }

    return NextResponse.json<ScanResult>({
      status: "success",
      customerName: customer.first_name,
      currentPunches: newPunches,
      punchesRequired: program.punches_required,
      rewardAvailable: false,
      message: `Punch added. ${customer.first_name} is at ${newPunches}/${program.punches_required}.`,
      customerId: customer.id,
      programId: program.id,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatRemaining(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
