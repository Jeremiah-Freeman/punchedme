import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanResult } from "@/lib/types";

/**
 * Core punch logic, shared by the authenticated dashboard scanner
 * (`/api/scans/process`) and the unattended device-token kiosk
 * (`/api/scans/kiosk`). Keeping it in one place means both surfaces apply
 * punches, cooldowns and reward thresholds identically — the kiosk is just a
 * different way of authorizing the same action.
 *
 * `db` must be a service-role (admin) client: this bypasses RLS and the caller
 * is responsible for having already established which business is acting.
 */
export async function processPunch(
  db: SupabaseClient,
  businessId: string,
  scannedToken: string
): Promise<ScanResult> {
  // Look up customer by token
  const { data: customer } = await db
    .from("customers")
    .select("id, first_name, business_id, public_token")
    .eq("public_token", scannedToken)
    .single();

  if (!customer) {
    return {
      status: "invalid",
      customerName: "",
      currentPunches: 0,
      punchesRequired: 0,
      rewardAvailable: false,
      message: "Invalid pass.",
    };
  }

  // Ensure token belongs to the scanned business
  if (customer.business_id !== businessId) {
    return {
      status: "invalid",
      customerName: customer.first_name,
      currentPunches: 0,
      punchesRequired: 0,
      rewardAvailable: false,
      message: "Pass does not belong to this business.",
    };
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
    return {
      status: "invalid",
      customerName: customer.first_name,
      currentPunches: 0,
      punchesRequired: 0,
      rewardAvailable: false,
      message: "No active loyalty program.",
    };
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
        current_punches: (program.head_start as number | null) ?? 3, // Head Start
        lifetime_punches: 0,
        rewards_earned: 0,
        rewards_redeemed: 0,
      })
      .select()
      .single();
    account = newAccount;
  }

  if (!account) {
    throw new Error("Could not load or create loyalty account");
  }

  // Check if reward is already available (before adding punch)
  if (account.current_punches >= program.punches_required) {
    return {
      status: "reward_available",
      customerName: customer.first_name,
      currentPunches: account.current_punches,
      punchesRequired: program.punches_required,
      rewardAvailable: true,
      message: `Reward available. ${customer.first_name} has ${account.current_punches}/${program.punches_required}. ${program.reward_name} ready to redeem!`,
      customerId: customer.id,
      programId: program.id,
    };
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
        return {
          status: "blocked",
          customerName: customer.first_name,
          currentPunches: account.current_punches,
          punchesRequired: program.punches_required,
          rewardAvailable: false,
          message: `Already punched recently. Next punch available in ${formatRemaining(minutesRemaining)}.`,
          cooldownMinutesRemaining: minutesRemaining,
        };
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
    return {
      status: "reward_available",
      customerName: customer.first_name,
      currentPunches: newPunches,
      punchesRequired: program.punches_required,
      rewardAvailable: true,
      message: `Reward earned! ${customer.first_name} has ${newPunches}/${program.punches_required}. ${program.reward_name} available!`,
      customerId: customer.id,
      programId: program.id,
    };
  }

  return {
    status: "success",
    customerName: customer.first_name,
    currentPunches: newPunches,
    punchesRequired: program.punches_required,
    rewardAvailable: false,
    message: `Punch added. ${customer.first_name} is at ${newPunches}/${program.punches_required}.`,
    customerId: customer.id,
    programId: program.id,
  };
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
  status?: number;
  rewardName?: string;
  newPunches?: number;
  customerName?: string;
}

/**
 * Redeem an earned reward. Subtract model: deduct the required punches and keep
 * any overflow. Shared by `/api/rewards/redeem` (dashboard) and the kiosk.
 *
 * `businessId`, when provided, scopes the redemption to that business — the
 * kiosk passes it so a device token can only ever redeem within its own shop.
 */
export async function redeemReward(
  db: SupabaseClient,
  customerId: string,
  programId: string,
  businessId?: string
): Promise<RedeemResult> {
  // Get program
  const { data: program } = await db
    .from("loyalty_programs")
    .select("*")
    .eq("id", programId)
    .single();

  if (!program) {
    return { ok: false, error: "Program not found", status: 404 };
  }

  if (businessId && program.business_id !== businessId) {
    return { ok: false, error: "Program does not belong to this business", status: 403 };
  }

  // Get account
  const { data: account } = await db
    .from("loyalty_accounts")
    .select("*")
    .eq("customer_id", customerId)
    .eq("program_id", programId)
    .single();

  if (!account) {
    return { ok: false, error: "Account not found", status: 404 };
  }

  if (account.current_punches < program.punches_required) {
    return { ok: false, error: "Not enough punches to redeem", status: 400 };
  }

  // Subtract model: deduct required punches, keep the rest — but never drop below
  // the Head Start. Redeeming shouldn't reset a regular to a cold zero; they walk
  // away already a few punches toward the next reward.
  const headStart = (program.head_start as number | null) ?? 3;
  const newPunches = Math.max(account.current_punches - program.punches_required, headStart);

  await db
    .from("loyalty_accounts")
    .update({
      current_punches: newPunches,
      rewards_redeemed: account.rewards_redeemed + 1,
    })
    .eq("id", account.id);

  // Get customer for business_id + name
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

  return {
    ok: true,
    rewardName: program.reward_name,
    newPunches,
    customerName: customer?.first_name ?? "",
  };
}

export function formatRemaining(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
