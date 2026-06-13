import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDeviceToken } from "@/lib/device-token";
import { processPunch, redeemReward } from "@/lib/scan";
import { normalizePhone } from "@/lib/utils";

/**
 * Unattended kiosk endpoint. Authorized ONLY by a device token (not a
 * dashboard session). The token resolves to a single business server-side, so
 * a kiosk can never act on another shop's customers. Supports exactly the
 * three actions Scan Mode needs and nothing else — no settings, no reads.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceToken, action } = body as {
      deviceToken?: string;
      action?: "punch" | "redeem" | "lookup";
    };

    if (!deviceToken) {
      return NextResponse.json({ error: "Missing device token" }, { status: 400 });
    }

    const db = createAdminClient();
    const device = await resolveDeviceToken(db, deviceToken);

    if (!device) {
      // 410 Gone: the kiosk should show "this device was disconnected".
      return NextResponse.json(
        { error: "This kiosk is no longer authorized. Ask the owner to reconnect it." },
        { status: 410 }
      );
    }

    if (action === "punch") {
      const { scannedToken } = body as { scannedToken?: string };
      if (!scannedToken) {
        return NextResponse.json({ error: "Missing scannedToken" }, { status: 400 });
      }
      const result = await processPunch(db, device.businessId, scannedToken);
      return NextResponse.json(result);
    }

    if (action === "redeem") {
      const { customerId, programId } = body as { customerId?: string; programId?: string };
      if (!customerId || !programId) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const result = await redeemReward(db, customerId, programId, device.businessId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json({
        ok: true,
        rewardName: result.rewardName,
        newPunches: result.newPunches,
        customerName: result.customerName,
      });
    }

    if (action === "lookup") {
      const { phone } = body as { phone?: string };
      if (!phone) {
        return NextResponse.json({ error: "Missing phone" }, { status: 400 });
      }
      const { data: customer } = await db
        .from("customers")
        .select("public_token, first_name")
        .eq("business_id", device.businessId)
        .eq("normalized_phone", normalizePhone(phone))
        .single();
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return NextResponse.json({ token: customer.public_token, name: customer.first_name });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Kiosk scan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
