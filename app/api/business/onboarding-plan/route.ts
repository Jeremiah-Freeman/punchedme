import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Finalizes onboarding: saves the chosen counter-display type and the plan
// decision. "free" = start free (no card). "ship_now" = wants the display
// shipped immediately — recorded as intent; the actual $19.99 charge is wired
// in the Stripe phase, so for now we capture the choice without charging.
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { businessId, displayType, plan } = body as {
      businessId: string;
      displayType: string;
      plan: "free" | "ship_now";
    };
    if (!businessId || !displayType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: biz } = await db
      .from("businesses")
      .select("id, name, contact_name, address")
      .eq("id", businessId)
      .eq("owner_user_id", user.id)
      .single();
    if (!biz) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const wantsShipNow = plan === "ship_now";
    // Stickers always ship now (cheap). A counter display only ships after
    // payment / the 50-member milestone — so its order starts pending.
    const displayStatus =
      displayType === "sticker" ? "preparing" : wantsShipNow ? "pending_payment" : "selected";

    await db
      .from("businesses")
      .update({
        selected_display_type: displayType,
        display_status: displayStatus,
        plan_type: "free",
        plan_status: "free_active",
        payment_status: "none",
        auto_activate_on_milestone: wantsShipNow,
      })
      .eq("id", businessId);

    // Record the display order (fulfillment tracking). Upsert per business so
    // re-walking onboarding updates the existing order instead of spawning
    // duplicates in the fulfillment queue.
    const fields = {
      business_id: businessId,
      display_type: displayType,
      status: displayStatus,
      shipping_name: biz.contact_name ?? biz.name,
      shipping_address: biz.address ?? null,
    };
    const { data: existingOrder } = await db
      .from("display_orders")
      .select("id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingOrder) {
      await db.from("display_orders").update(fields).eq("id", existingOrder.id);
    } else {
      await db.from("display_orders").insert(fields);
    }

    return NextResponse.json({ ok: true, displayStatus });
  } catch (err) {
    console.error("onboarding-plan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
