import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { processPunch } from "@/lib/scan";

// Staff scanner endpoint (dashboard Scan Mode). Must be the authenticated owner
// of the business — otherwise anyone could forge punches for any customer.
// Customer self-scan uses /api/scans/checkin; kiosks use /api/scans/kiosk.
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { scannedToken, businessId } = body as {
      scannedToken: string;
      businessId: string;
    };

    if (!scannedToken || !businessId) {
      return NextResponse.json(
        { error: "Missing scannedToken or businessId" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // The caller must own the business they're punching against.
    const { data: biz } = await db
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!biz) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await processPunch(db, businessId, scannedToken);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
