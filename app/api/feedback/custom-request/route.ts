import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, businessId } = body as { message: string; businessId?: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Open, unauthenticated endpoint — cap it so it can't be used as a spam sink.
    if (!(await checkRateLimit(db, `feedback:${clientIp(request)}`, 5, 600))) {
      return NextResponse.json({ ok: true });
    }
    await db.from("custom_requests").insert({
      business_id: businessId ?? null,
      message: message.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Custom request error:", err);
    return NextResponse.json({ ok: true }); // Always succeed client-side
  }
}
