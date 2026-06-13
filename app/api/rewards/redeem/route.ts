import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemReward } from "@/lib/scan";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, programId } = body as {
      customerId: string;
      programId: string;
    };

    if (!customerId || !programId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await redeemReward(db, customerId, programId);

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
