import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedDevice {
  tokenId: string;
  businessId: string;
  businessName: string;
  label: string;
}

/**
 * Resolve a kiosk device token to its business. Returns null if the token is
 * unknown or has been revoked — callers treat both as "this kiosk is no longer
 * authorized". Requires a service-role (admin) client.
 *
 * On a successful resolve we stamp last_used_at (fire-and-forget) so the owner
 * can see which kiosks are live in the dashboard.
 */
export async function resolveDeviceToken(
  db: SupabaseClient,
  token: string
): Promise<ResolvedDevice | null> {
  if (!token || token.length < 8) return null;

  const { data: device } = await db
    .from("device_tokens")
    .select("id, business_id, label, revoked_at, businesses(name)")
    .eq("token", token)
    .single();

  if (!device || device.revoked_at) return null;

  // Touch last_used_at without blocking the scan.
  void db
    .from("device_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", device.id);

  // Supabase types the embedded relation as an array or object depending on
  // the join; normalize defensively.
  const biz = device.businesses as unknown;
  const businessName = Array.isArray(biz)
    ? (biz[0]?.name ?? "")
    : ((biz as { name?: string } | null)?.name ?? "");

  return {
    tokenId: device.id,
    businessId: device.business_id,
    businessName,
    label: device.label,
  };
}
