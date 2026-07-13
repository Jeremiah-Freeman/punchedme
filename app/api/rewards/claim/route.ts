import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClaimResult } from "@/lib/types";

// Customer-initiated cash-out (the CASH OUT button on the post-scan screen).
// Spends punches from the banked balance at a chosen rung and mints a short-lived
// ticket the staff honors. Balance never resets — this only ever SUBTRACTS the
// rung's cost and keeps the remainder banked.
//
// Auth model matches the public checkin route: the customer proves identity with
// their public_token scoped to the business slug. No dollars move here; the worst
// a forged request can do is spend that customer's own banked punches.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerToken, businessSlug, rungId } = body as {
      customerToken: string;
      businessSlug: string;
      rungId: string;
    };

    if (!customerToken || !businessSlug || !rungId) {
      return NextResponse.json<ClaimResult>(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("id, name")
      .eq("slug", businessSlug)
      .single();
    if (!business) {
      return NextResponse.json<ClaimResult>({ ok: false, error: "Business not found" }, { status: 404 });
    }

    const { data: customer } = await db
      .from("customers")
      .select("id, first_name, business_id")
      .eq("public_token", customerToken)
      .eq("business_id", business.id)
      .single();
    if (!customer) {
      return NextResponse.json<ClaimResult>({ ok: false, error: "Pass not found for this business" }, { status: 404 });
    }

    const { data: program } = await db
      .from("loyalty_programs")
      .select("id, business_id, head_start")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!program) {
      return NextResponse.json<ClaimResult>({ ok: false, error: "No active loyalty program" }, { status: 404 });
    }

    // The rung must belong to this program (can't claim another shop's menu).
    const { data: rung } = await db
      .from("reward_rungs")
      .select("id, cost, reward_name, program_id")
      .eq("id", rungId)
      .eq("program_id", program.id)
      .single();
    if (!rung) {
      return NextResponse.json<ClaimResult>({ ok: false, error: "Reward not found" }, { status: 404 });
    }

    const { data: account } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("program_id", program.id)
      .single();
    if (!account) {
      return NextResponse.json<ClaimResult>({ ok: false, error: "No punches banked yet" }, { status: 400 });
    }
    if (account.current_punches < rung.cost) {
      return NextResponse.json<ClaimResult>(
        { ok: false, error: "Not enough punches banked for this reward yet." },
        { status: 400 }
      );
    }

    // Never a cold zero: after spending, re-seed to the Head Start so they leave
    // already a few punches toward the next reward, not back to stranger.
    const headStart = (program.head_start as number | null) ?? 3;
    const balanceAfter = Math.max(account.current_punches - rung.cost, headStart);

    // Conditional update guards against a double-tap / concurrent cash-out: the
    // .gte() means the row only changes if the balance still covers the cost.
    const { data: updated } = await db
      .from("loyalty_accounts")
      .update({
        current_punches: balanceAfter,
        rewards_redeemed: account.rewards_redeemed + 1,
      })
      .eq("id", account.id)
      .gte("current_punches", rung.cost)
      .select("id")
      .single();

    if (!updated) {
      return NextResponse.json<ClaimResult>(
        { ok: false, error: "That reward was just claimed — pull up your card again." },
        { status: 409 }
      );
    }

    // Mint the ticket (pending). ticket_token + expires_at come from DB defaults.
    const { data: ticket, error: ticketErr } = await db
      .from("reward_redemptions")
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        program_id: program.id,
        account_id: account.id,
        rung_id: rung.id,
        reward_name: rung.reward_name,
        cost: rung.cost,
        balance_after: balanceAfter,
        status: "pending",
      })
      .select("ticket_token, expires_at")
      .single();

    if (ticketErr || !ticket) {
      // Roll the balance back so a failed ticket doesn't eat the customer's punches.
      await db
        .from("loyalty_accounts")
        .update({
          current_punches: account.current_punches,
          rewards_redeemed: account.rewards_redeemed,
        })
        .eq("id", account.id);
      return NextResponse.json<ClaimResult>({ ok: false, error: "Could not create ticket. Try again." }, { status: 500 });
    }

    await db.from("scan_events").insert({
      business_id: business.id,
      customer_id: customer.id,
      program_id: program.id,
      event_type: "reward_redeemed",
      punches_delta: -rung.cost,
      metadata: {
        reward_name: rung.reward_name,
        rung_id: rung.id,
        cost: rung.cost,
        balance_after: balanceAfter,
        source: "customer_cash_out",
      },
    });

    return NextResponse.json<ClaimResult>({
      ok: true,
      ticketToken: ticket.ticket_token as string,
      rewardName: rung.reward_name,
      cost: rung.cost,
      balanceAfter,
      expiresAt: ticket.expires_at as string,
    });
  } catch (err) {
    console.error("Claim error:", err);
    return NextResponse.json<ClaimResult>({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
