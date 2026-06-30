import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessCoords } from "@/lib/locations";

/**
 * GET /api/wallet/google/[token]
 *
 * Returns a redirect to Google Wallet's "Save to Google Wallet" URL.
 * Falls back to web pass if Google credentials are not configured.
 *
 * Required env vars:
 *   GOOGLE_WALLET_ISSUER_ID
 *   GOOGLE_WALLET_CLASS_ID   (optional, defaults to issuerID.punchless)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_KEY  (base64-encoded service account JSON)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("id, first_name, wallet_serial, business_id")
    .eq("public_token", token)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: business } = await db
    .from("businesses")
    .select("name, brand_color, latitude, longitude, logo_url")
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

  const googleConfigured =
    !!process.env.GOOGLE_WALLET_ISSUER_ID &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!googleConfigured) {
    return NextResponse.redirect(
      `${base}/pass/${token}?wallet=google-not-configured`
    );
  }

  // Until the issuer clears Google's publishing review, the "Save to Google
  // Wallet" link only works for registered test accounts — every real customer
  // hits a Google-side error. So while unpublished we send them to the working
  // web card instead of a dead end. Flip GOOGLE_WALLET_PUBLISHED=true in the
  // env the moment Google approves and the native save goes live with no code
  // change. ?force=1 lets a tester (Jay) still trigger the real native add.
  const published = process.env.GOOGLE_WALLET_PUBLISHED === "true";
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!published && !force) {
    return NextResponse.redirect(`${base}/pass/${token}?wallet=google-pending`);
  }

  const { generateGoogleWalletUrl } = await import("@/lib/wallet/google");

  const biz = business as { name?: string; brand_color?: string; logo_url?: string | null; latitude?: number | null; longitude?: number | null } | null;

  const saveUrl = await generateGoogleWalletUrl({
    token,
    walletSerial: customer.wallet_serial,
    customerName: customer.first_name,
    businessName: biz?.name ?? "Rewards",
    brandColor: biz?.brand_color ?? "#6366f1",
    logoUrl: biz?.logo_url ?? null,
    currentPunches: account?.current_punches ?? 0,
    punchesRequired: program?.punches_required ?? 10,
    rewardName: program?.reward_name ?? "Reward",
    appUrl: base,
    latitude: biz?.latitude ?? null,
    longitude: biz?.longitude ?? null,
    locations: await getBusinessCoords(db, customer.business_id, {
      latitude: biz?.latitude ?? null,
      longitude: biz?.longitude ?? null,
    }),
  });

  return NextResponse.redirect(saveUrl);
}
