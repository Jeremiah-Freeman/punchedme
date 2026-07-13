import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, slugify, appUrl } from "@/lib/utils";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { PLAN_CAPS } from "@/lib/stripe";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessSlug, firstName, phoneNumber } = body as {
      businessSlug: string;
      firstName: string;
      phoneNumber: string;
    };

    if (!businessSlug || !firstName || !phoneNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Rate limit by IP — stops scripted mass-joins and phone enumeration. A real
    // shop counter sees a handful of joins a minute; 20 is generous headroom.
    if (!(await checkRateLimit(db, `signup:${clientIp(request)}`, 20, 60))) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const normalizedPhone = normalizePhone(phoneNumber);

    // Validate phone — must be 10 or 11 digits after stripping non-numeric
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit phone number." },
        { status: 400 }
      );
    }

    // Find business
    const { data: business, error: bizErr } = await db
      .from("businesses")
      .select("id, name, plan_type")
      .eq("slug", businessSlug)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Find active program
    const { data: program, error: progErr } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (progErr || !program) {
      return NextResponse.json(
        { error: "No active loyalty program" },
        { status: 404 }
      );
    }

    // Check for existing customer (same business + phone)
    const { data: existingCustomer } = await db
      .from("customers")
      .select("id, public_token")
      .eq("business_id", business.id)
      .eq("normalized_phone", normalizedPhone)
      .single();

    let customerId: string;
    let publicToken: string;

    if (existingCustomer) {
      // Customer already exists — return their pass
      customerId = existingCustomer.id;
      publicToken = existingCustomer.public_token;
    } else {
      // Plan member cap — soft-pause NEW joins once the shop is at its limit.
      // Existing members (handled above) always keep their card and keep earning.
      const cap = PLAN_CAPS[(business.plan_type as string) ?? "free"] ?? PLAN_CAPS.free;
      const { count: memberCount } = await db
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id);
      if ((memberCount ?? 0) >= cap) {
        return NextResponse.json(
          {
            error: `${business.name} isn't accepting new members right now. Check back soon!`,
            status: "at_capacity",
          },
          { status: 403 }
        );
      }

      // Create new customer
      publicToken = randomBytes(32).toString("hex");
      const walletSerial = randomBytes(16).toString("hex");

      const { data: newCustomer, error: custErr } = await db
        .from("customers")
        .insert({
          business_id: business.id,
          first_name: firstName.trim(),
          phone_number: phoneNumber.trim(),
          normalized_phone: normalizedPhone,
          public_token: publicToken,
          wallet_serial: walletSerial,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        console.error("Customer insert error:", custErr);
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;

      // Create loyalty account — Head Start: new members begin a few punches in
      // (endowed progress), not at a cold zero. lifetime stays 0: the head start is
      // banked progress toward a reward, not a real visit.
      await db.from("loyalty_accounts").insert({
        customer_id: customerId,
        program_id: program.id,
        current_punches: (program.head_start as number | null) ?? 3,
        lifetime_punches: 0,
        rewards_earned: 0,
        rewards_redeemed: 0,
      });

      // Create fallback wallet pass record
      await db.from("wallet_passes").insert({
        customer_id: customerId,
        wallet_type: "fallback",
        serial_number: walletSerial,
      });
    }

    const base = appUrl();
    const fallbackPassUrl = `${base}/pass/${publicToken}`;

    // Check if Apple/Google creds configured
    const appleConfigured =
      !!process.env.APPLE_TEAM_ID &&
      !!process.env.APPLE_PASS_TYPE_ID &&
      !!process.env.APPLE_PASS_CERTIFICATE;
    // Only offer the Google Wallet button once the issuer clears Google's
    // publishing review (GOOGLE_WALLET_PUBLISHED=true). Before that the native
    // save errors for non-test accounts, so customers use the web card instead.
    const googleConfigured =
      !!process.env.GOOGLE_WALLET_ISSUER_ID &&
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_WALLET_PUBLISHED === "true";

    return NextResponse.json({
      customerId,
      publicToken,
      appleWalletUrl: appleConfigured
        ? `${base}/api/wallet/apple/${publicToken}`
        : null,
      googleWalletUrl: googleConfigured
        ? `${base}/api/wallet/google/${publicToken}`
        : null,
      fallbackPassUrl,
      headStart: (program.head_start as number | null) ?? 3,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
