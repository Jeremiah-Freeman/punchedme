import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Owner-facing management of kiosk device tokens. All actions are scoped to the
// signed-in owner's business; the kiosk itself never touches this route.

async function getOwnerBusiness() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
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
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const { data: tokens } = await ctx.db
      .from("device_tokens")
      .select("id, label, token, created_at, last_used_at, revoked_at")
      .eq("business_id", ctx.businessId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ tokens: tokens ?? [] });
  } catch (err) {
    console.error("device-tokens GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOwnerBusiness();
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    let label = "Kiosk";
    try {
      const body = await request.json();
      if (typeof body?.label === "string" && body.label.trim()) {
        label = body.label.trim().slice(0, 60);
      }
    } catch {
      // No body — use the default label.
    }

    const { data: token, error } = await ctx.db
      .from("device_tokens")
      .insert({ business_id: ctx.businessId, label })
      .select("id, label, token, created_at, last_used_at, revoked_at")
      .single();

    if (error || !token) {
      console.error("device-tokens insert error:", error);
      return NextResponse.json({ error: "Could not create token" }, { status: 500 });
    }

    return NextResponse.json({ token });
  } catch (err) {
    console.error("device-tokens POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getOwnerBusiness();
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Revoke (soft) rather than delete, so the kiosk's last-used history and the
    // audit trail survive. Scoped to this owner's business.
    const { error } = await ctx.db
      .from("device_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", ctx.businessId);

    if (error) {
      console.error("device-tokens revoke error:", error);
      return NextResponse.json({ error: "Could not revoke token" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("device-tokens DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
