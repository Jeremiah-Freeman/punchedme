import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Owner-facing management of this business's physical /c/<code> codes (sticker
// pool + counter stand). A business can hold many codes — they all route to the
// same join/punch flow, so a lost or replaced sticker is just a new code bound
// to the same business. Customers belong to the business, never to a code, so
// activating a new code never disrupts existing members.

async function getOwnerBusiness() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const db = createAdminClient();
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!business) return { error: "No business", status: 404 as const };
  return { db, businessId: business.id as string };
}

export async function GET() {
  try {
    const ctx = await getOwnerBusiness();
    if ("error" in ctx)
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const { data: codes } = await ctx.db
      .from("sticker_codes")
      .select("code, claimed_at, created_at")
      .eq("business_id", ctx.businessId)
      .order("claimed_at", { ascending: false });

    return NextResponse.json({ codes: codes ?? [] });
  } catch (err) {
    console.error("codes GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Activate a code (a replacement sticker, or a stand you received) by binding it
// to this business — only if it's unclaimed or already yours.
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOwnerBusiness();
    if ("error" in ctx)
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    let code = "";
    try {
      const body = await request.json();
      code = String(body?.code ?? "").trim().toUpperCase();
    } catch {
      // no/invalid body — handled below
    }
    if (!code) return NextResponse.json({ error: "Enter a code" }, { status: 400 });

    const { data: existing } = await ctx.db
      .from("sticker_codes")
      .select("code, business_id")
      .eq("code", code)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "That code isn't one of ours — double-check it." },
        { status: 404 }
      );
    }
    if (existing.business_id && existing.business_id !== ctx.businessId) {
      return NextResponse.json(
        { error: "That code is already in use by another shop." },
        { status: 409 }
      );
    }
    if (existing.business_id === ctx.businessId) {
      return NextResponse.json({ ok: true, alreadyYours: true });
    }

    // Bind only if still unclaimed (guards against a race claiming it elsewhere).
    const { error } = await ctx.db
      .from("sticker_codes")
      .update({ business_id: ctx.businessId, claimed_at: new Date().toISOString() })
      .eq("code", code)
      .is("business_id", null);

    if (error) {
      console.error("codes claim error:", error);
      return NextResponse.json(
        { error: "Could not activate that code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("codes POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
