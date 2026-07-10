import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessCoords } from "@/lib/locations";
import { moeMoney, rankFor, rankJustEarned } from "@/lib/loyalty-flavor";
import { computeBank, crossedRung as crossedRungOf } from "@/lib/punch-bank";
import { TEST_MODE } from "@/lib/test-mode";
import type { ScanResult } from "@/lib/types";

const GEO_RADIUS_M = 100;

// Light "open hours" guard for customer self-scan: block punches in the dead of
// night (local time). Blocks 1:00–4:59am in the business's timezone. Generous on
// purpose — virtually no legit punches happen then, and we never block daytime.
const OVERNIGHT_BLOCK_START = 1;
const OVERNIGHT_BLOCK_END = 5;

function localHour(timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value;
    return h != null ? Number(h) % 24 : null;
  } catch {
    return null;
  }
}

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
      .select("id, name, latitude, longitude, timezone")
      .eq("slug", businessSlug)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Open-hours guard — no overnight self-scan punches. (Skipped in test mode.)
    const hour = localHour(business.timezone ?? "America/Los_Angeles");
    if (!TEST_MODE && hour !== null && hour >= OVERNIGHT_BLOCK_START && hour < OVERNIGHT_BLOCK_END) {
      return NextResponse.json(
        {
          status: "closed",
          businessName: business.name,
          message: `${business.name} isn't open right now — come by during the day to earn a punch.`,
        },
        { status: 403 }
      );
    }

    // GPS check — if the shop has set a location, the customer must prove they're
    // near it. Previously a desktop user or anyone who tapped "Deny" on the
    // location prompt skipped this entirely (lat/lng null) and got a free punch.
    // Now: location configured ⇒ location required AND within radius. Shops that
    // never set a location (no coords) are unenforced, as before.
    const storeCoords = await getBusinessCoords(db, business.id, business);
    if (!TEST_MODE && storeCoords.length > 0) {
      if (latitude === null || longitude === null) {
        return NextResponse.json(
          {
            status: "location_required",
            businessName: business.name,
            message: `Turn on location so we can confirm you're at ${business.name}.`,
          },
          { status: 403 }
        );
      }
      const nearest = Math.min(
        ...storeCoords.map((c) =>
          haversineDistance(latitude, longitude, c.latitude, c.longitude)
        )
      );
      if (nearest > GEO_RADIUS_M) {
        return NextResponse.json(
          {
            status: "too_far",
            distanceMeters: Math.round(nearest),
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

    // Punch Bank — load the owner's reward menu (seeded so every program has ≥1 rung).
    const { data: rungRows } = await db
      .from("reward_rungs")
      .select("id, cost, reward_name")
      .eq("program_id", program.id)
      .order("cost", { ascending: true });
    const rungs = (rungRows ?? []).map((r) => ({
      id: r.id as string,
      cost: r.cost as number,
      rewardName: r.reward_name as string,
    }));
    // Lowest rung cost = the point a reward first becomes claimable.
    const minCost = rungs.length ? rungs[0].cost : program.punches_required;

    // Pack the banked-balance view (rung unlock states, next rung, what just crossed).
    const bankFields = (balance: number, prev?: number) => {
      const bank = computeBank(balance, rungs);
      const crossed = prev !== undefined ? crossedRungOf(prev, balance, rungs) : null;
      return {
        balance,
        rungs: bank.rungs,
        nextRung: bank.nextRung,
        crossedRung: crossed
          ? { id: crossed.id, cost: crossed.cost, rewardName: crossed.rewardName }
          : null,
      };
    };

    // Cooldown check — even when blocked from adding a punch, surface the banked
    // balance so someone with a reward waiting can still cash out (unlocked rungs
    // are claimable forever; silence keeps them banked). Skipped in test mode so
    // you can punch on repeat.
    if (!TEST_MODE && program.punch_cooldown_minutes > 0) {
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
          const rewardWaiting = account.current_punches >= minCost;
          return NextResponse.json<ScanResult>({
            status: rewardWaiting ? "reward_available" : "blocked",
            customerName: customer.first_name,
            currentPunches: account.current_punches,
            punchesRequired: program.punches_required,
            rewardAvailable: rewardWaiting,
            message: rewardWaiting
              ? "You've already punched in today — but you've got a reward banked. Cash out or let it ride."
              : `Already punched today! Come back in ${formatRemaining(minutesRemaining)}.`,
            customerId: customer.id,
            programId: program.id,
            ...bankFields(account.current_punches),
          });
        }
      }
    }

    // Add punch — the Punch Bank always banks the visit. There is no cap at a
    // reward: that's the whole point of "let it ride." Balance grows; a redemption
    // subtracts. rewards_earned ticks only when this visit crosses a new rung.
    const newPunches = account.current_punches + 1;
    const newLifetime = account.lifetime_punches + 1;
    const crossed = crossedRungOf(account.current_punches, newPunches, rungs);

    await db
      .from("loyalty_accounts")
      .update({
        current_punches: newPunches,
        lifetime_punches: newLifetime,
        ...(crossed ? { rewards_earned: account.rewards_earned + 1 } : {}),
      })
      .eq("id", account.id);

    await db.from("scan_events").insert({
      business_id: business.id,
      customer_id: customer.id,
      program_id: program.id,
      event_type: crossed ? "reward_earned" : "punch_added",
      punches_delta: 1,
      metadata: {
        previous_punches: account.current_punches,
        new_punches: newPunches,
        source: "customer_self_checkin",
      },
    });

    // Honest-points layer — computed from the lifetime count we just wrote.
    const honest = {
      lifetimePunches: newLifetime,
      rank: rankFor(newLifetime),
      rankJustEarned: rankJustEarned(newLifetime),
      moeMoney: moeMoney(newLifetime),
    };

    const rewardAvailable = newPunches >= minCost;

    return NextResponse.json<ScanResult>({
      status: rewardAvailable ? "reward_available" : "success",
      customerName: customer.first_name,
      currentPunches: newPunches,
      punchesRequired: program.punches_required,
      rewardAvailable,
      message: crossed
        ? `You just unlocked ${crossed.rewardName}! Cash out or let it ride.`
        : rewardAvailable
        ? `Punch added — you're at ${newPunches}, with a reward banked.`
        : `Punch added — you're at ${newPunches}.`,
      customerId: customer.id,
      programId: program.id,
      ...honest,
      ...bankFields(newPunches, account.current_punches),
    });
  } catch (err) {
    console.error("Checkin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
