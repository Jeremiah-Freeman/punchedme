import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redeemReward } from "@/lib/scan";

// Staff reward-redemption (dashboard). Must be the authenticated owner of the
// business the customer belongs to — otherwise anyone could redeem anyone's
// reward. Kiosk redemption goes through /api/scans/kiosk (device-token scoped).
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { customerId, programId } = body as {
      customerId: string;
      programId: string;
    };

    if (!customerId || !programId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();

    // The customer must belong to a business this user owns.
    const { data: customer } = await db
      .from("customers")
      .select("id, business_id, businesses!inner(owner_user_id)")
      .eq("id", customerId)
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    const ownerId = (customer.businesses as unknown as { owner_user_id: string }).owner_user_id;
    if (ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await redeemReward(db, customerId, programId, customer.business_id as string);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({
      ok: true,
      rewardName: result.rewardName,
      newPunches: result.newPunches,
      customerName: result.customerName,
    });
  } catch (err) {
    console.error("Redeem error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
