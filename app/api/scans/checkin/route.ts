import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScanResult } from "@/lib/types";

const GEO_RADIUS_M = 200;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRemaining(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerToken, businessSlug, latitude, longitude } = body as {
      customerToken: string;
      businessSlug: string;
      latitude: number | null;
      longitude: number | null;
    };

    if (!customerToken || !businessSlug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Look up business by slug
    const { data: business } = await db
      .from("businesses")
      .select("id, name, latitude, longitude")
      .eq("slug", businessSlug)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // GPS check — only if we have both customer coords and business coords
    if (
      latitude !== null &&
      longitude !== null &&
      business.latitude &&
      business.longitude
    ) {
      const dist = haversineDistance(
        latitude,
        longitude,
        business.latitude,
        business.longitude
      );
      if (dist > GEO_RADIUS_M) {
        return NextResponse.json(
          {
            status: "too_far",
            distanceMeters: Math.round(dist),
            businessName: business.name,
            message: `You need to be at ${business.name} to earn a punch.`,
          },
          { status: 403 }
        );
      }
    }

    // Look up customer by token + business
    const { data: customer } = await db
      .from("customers")
      .select("id, first_name, business_id, public_token")
      .eq("public_token", customerToken)
      .eq("business_id", business.id)
      .single();

    if (!customer) {
      return NextResponse.json(
        { status: "invalid", message: "Pass not found for this business." },
        { status: 404 }
      );
    }

    // Get active program
    const { data: program } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", business.id)
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

    // Reward already waiting
    if (account.current_punches >= program.punches_required) {
      return NextResponse.json<ScanResult>({
        status: "reward_available",
        customerName: customer.first_name,
        currentPunches: account.current_punches,
        punchesRequired: program.punches_required,
        rewardAvailable: true,
        message: `You've earned your ${program.reward_name}! Show this screen to claim it.`,
        customerId: customer.id,
        programId: program.id,
      });
    }

    // Cooldown check
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
        const elapsed = Date.now() - new Date(lastPunch.created_at).getTime();
        const cooldownMs = program.punch_cooldown_minutes * 60 * 1000;
        if (elapsed < cooldownMs) {
          const minutesRemaining = Math.ceil((cooldownMs - elapsed) / 60000);
          return NextResponse.json<ScanResult>({
            status: "blocked",
            customerName: customer.first_name,
            currentPunches: account.current_punches,
            punchesRequired: program.punches_required,
            rewardAvailable: false,
            message: `Already punched today! Come back in ${formatRemaining(minutesRemaining)}.`,
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

    await db.from("scan_events").insert({
      business_id: business.id,
      customer_id: customer.id,
      program_id: program.id,
      event_type: rewardEarned ? "reward_earned" : "punch_added",
      punches_delta: 1,
      metadata: {
        previous_punches: account.current_punches,
        new_punches: newPunches,
        source: "customer_self_checkin",
      },
    });

    if (rewardEarned) {
      return NextResponse.json<ScanResult>({
        status: "reward_available",
        customerName: customer.first_name,
        currentPunches: newPunches,
        punchesRequired: program.punches_required,
        rewardAvailable: true,
        message: `You earned your ${program.reward_name}! Show this screen to claim it.`,
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
      message: `Punch added! ${newPunches} of ${program.punches_required} visits.`,
      customerId: customer.id,
      programId: program.id,
    });
  } catch (err) {
    console.error("Checkin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
