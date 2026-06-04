import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessCoords } from "@/lib/locations";

/**
 * GET /api/wallet/apple/[token]
 *
 * Returns a .pkpass file (zip archive) for Apple Wallet.
 * Falls back to a redirect to the web pass if Apple credentials are not configured.
 *
 * Full Apple Wallet implementation requires:
 *   - Apple Developer account with Pass Type ID
 *   - Signed certificate (.p12)
 *   - WWDR certificate
 *
 * Set these env vars:
 *   APPLE_TEAM_ID, APPLE_PASS_TYPE_ID,
 *   APPLE_PASS_CERTIFICATE (base64 .p12),
 *   APPLE_PASS_CERTIFICATE_PASSWORD,
 *   APPLE_WWDR_CERTIFICATE (base64 WWDR PEM)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = createAdminClient();

  // Look up customer
  const { data: customer } = await db
    .from("customers")
    .select("id, first_name, wallet_serial, business_id")
    .eq("public_token", token)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Look up business + program
  const { data: business } = await db
    .from("businesses")
    .select("name, brand_color, latitude, longitude")
    .eq("id", customer.business_id)
    .single();

  const { data: program } = await db
    .from("loyalty_programs")
    .select("reward_name, punches_required")
    .eq("business_id", customer.business_id)
    .eq("is_active", true)
    .single();

  const { data: account } = await db
    .from("loyalty_accounts")
    .select("current_punches")
    .eq("customer_id", customer.id)
    .single();

  const currentPunches = account?.current_punches ?? 0;
  const punchesRequired = program?.punches_required ?? 10;
  const rewardName = program?.reward_name ?? "Reward";
  const businessName = business?.name ?? "Rewards";
  const brandColor = business?.brand_color ?? "#6366f1";
  const latitude = (business as { latitude?: number | null } | null)?.latitude ?? null;
  const longitude = (business as { longitude?: number | null } | null)?.longitude ?? null;
  const storeLocations = await getBusinessCoords(db, customer.business_id, {
    latitude,
    longitude,
  });

  const appConfigured =
    !!process.env.APPLE_TEAM_ID &&
    !!process.env.APPLE_PASS_TYPE_ID &&
    !!process.env.APPLE_PASS_CERTIFICATE;

  if (!appConfigured) {
    // Redirect to fallback web pass with instructions
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${base}/pass/${token}?wallet=apple-not-configured`
    );
  }

  // ── Apple Wallet pass generation ──────────────────────────────────────────
  // Dynamically import to avoid build errors when node-forge isn't needed
  const { generateApplePass } = await import("@/lib/wallet/apple");

  const passBuffer = await generateApplePass({
    token,
    serialNumber: customer.wallet_serial,
    customerName: customer.first_name,
    businessName,
    brandColor,
    currentPunches,
    punchesRequired,
    rewardName,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    latitude,
    longitude,
    locations: storeLocations,
  });

  return new NextResponse(passBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="punchless.pkpass"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
