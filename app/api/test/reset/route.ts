import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEST_MODE } from "@/lib/test-mode";

// Sandbox reset — wipes test customers so you can re-run the flows clean.
// HARD-GATED: returns 404 unless TEST_MODE is on, so this route simply does not
// exist in production. Deleting a customer cascades to their loyalty account,
// wallet pass, scan events, and redemptions (all FK ON DELETE CASCADE).
//
// POST body:
//   { businessSlug }          → wipe ALL customers for that shop
//   { businessSlug, token }   → wipe just the one customer with that public_token
export async function POST(request: NextRequest) {
  if (!TEST_MODE) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { businessSlug, token } = body as {
      businessSlug?: string;
      token?: string;
    };
    if (!businessSlug) {
      return NextResponse.json({ error: "Missing businessSlug" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("id, name")
      .eq("slug", businessSlug)
      .single();
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (token) {
      const { data: gone } = await db
        .from("customers")
        .delete()
        .eq("business_id", business.id)
        .eq("public_token", token)
        .select("id");
      return NextResponse.json({ ok: true, deleted: gone?.length ?? 0, scope: "customer" });
    }

    const { data: gone } = await db
      .from("customers")
      .delete()
      .eq("business_id", business.id)
      .select("id");
    return NextResponse.json({
      ok: true,
      deleted: gone?.length ?? 0,
      scope: "business",
      business: business.name,
    });
  } catch (err) {
    console.error("Test reset error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
