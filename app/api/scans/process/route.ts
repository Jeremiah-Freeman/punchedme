import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPunch } from "@/lib/scan";

export async function POST(request: NextRequest) {
  try {
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
    const result = await processPunch(db, businessId, scannedToken);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
