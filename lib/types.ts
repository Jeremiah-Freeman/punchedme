export type WalletType = "apple" | "google" | "fallback";
export type StaffRole = "owner" | "manager" | "cashier";
export type ScanEventType =
  | "punch_added"
  | "reward_earned"
  | "reward_redeemed"
  | "manual_adjustment"
  | "blocked"
  | "undo";

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  reward_name: string;
  punches_required: number;
  punch_cooldown_minutes: number;
  head_start: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  first_name: string;
  phone_number: string;
  normalized_phone: string;
  public_token: string;
  wallet_serial: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyAccount {
  id: string;
  customer_id: string;
  program_id: string;
  current_punches: number;
  lifetime_punches: number;
  rewards_earned: number;
  rewards_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface ScanEvent {
  id: string;
  business_id: string;
  customer_id: string;
  program_id: string;
  staff_user_id: string | null;
  event_type: ScanEventType;
  punches_delta: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface StaffUser {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  pin_hash: string | null;
  role: StaffRole;
  created_at: string;
}

export interface WalletPass {
  id: string;
  customer_id: string;
  wallet_type: WalletType;
  pass_identifier: string | null;
  serial_number: string | null;
  google_object_id: string | null;
  last_updated_at: string;
  created_at: string;
}

// A configured reward rung (DB row shape, snake_case).
export interface RewardRung {
  id: string;
  program_id: string;
  cost: number;
  reward_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RedemptionStatus = "pending" | "redeemed" | "voided";

export interface RewardRedemption {
  id: string;
  business_id: string;
  customer_id: string;
  program_id: string;
  account_id: string;
  rung_id: string | null;
  reward_name: string;
  cost: number;
  balance_after: number;
  status: RedemptionStatus;
  ticket_token: string;
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
}

// API response types
export interface ScanResult {
  status: "success" | "reward_available" | "blocked" | "invalid" | "already_redeemed";
  customerName: string;
  currentPunches: number;
  punchesRequired: number;
  rewardAvailable: boolean;
  message: string;
  customerId?: string;
  programId?: string;
  cooldownMinutesRemaining?: number;
  // "Honest points" layer — lifetime visits (never resets), the rank it earns,
  // and Moe Money (lifetime × 100). Optional so older/other scan paths still type.
  lifetimePunches?: number;
  rank?: string;
  rankJustEarned?: string | null;
  moeMoney?: number;
  // Punch Bank layer — the banked balance and the owner's reward menu. Balance is
  // the same number as currentPunches (never resets); rungs are the cash-out choices.
  // Optional so other scan paths (staff/kiosk) that don't compute the bank still type.
  balance?: number;
  rungs?: { id: string; cost: number; rewardName: string; unlocked: boolean }[];
  crossedRung?: { id: string; cost: number; rewardName: string } | null;
  nextRung?: { id: string; cost: number; rewardName: string; toNext: number } | null;
}

// Customer cash-out → a timed ticket the staff honors.
export interface ClaimResult {
  ok: boolean;
  error?: string;
  ticketToken?: string;
  rewardName?: string;
  cost?: number;
  balanceAfter?: number;
  expiresAt?: string;
}

export interface SignupResult {
  customerId: string;
  publicToken: string;
  appleWalletUrl: string | null;
  googleWalletUrl: string | null;
  fallbackPassUrl: string;
  headStart?: number; // punches banked at signup (endowed progress)
}

export interface CustomerWithAccount extends Customer {
  loyalty_accounts: (LoyaltyAccount & {
    loyalty_programs: LoyaltyProgram;
  })[];
}
