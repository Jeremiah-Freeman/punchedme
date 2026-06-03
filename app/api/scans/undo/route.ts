import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UNDO_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scanEventId } = body as { scanEventId: string };

    if (!scanEventId) {
      return NextResponse.json({ error: "Missing scanEventId" }, { status: 400 });
    }

    const db = createAdminClient();

    // Fetch the event to undo
    const { data: event } = await db
      .from("scan_events")
      .select("*, businesses!inner(owner_user_id)")
      .eq("id", scanEventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const biz = event.businesses as unknown as { owner_user_id: string };
    if (biz.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check undo window
    const age = Date.now() - new Date(event.created_at).getTime();
    if (age > UNDO_WINDOW_MS) {
      return NextResponse.json(
        { error: "Undo window expired (2 minutes)" },
        { status: 400 }
      );
    }

    if (event.event_type !== "punch_added" && event.event_type !== "reward_earned") {
      return NextResponse.json(
        { error: "Can only undo punch_added or reward_earned events" },
        { status: 400 }
      );
    }

    // Reverse the punch
    const { data: account } = await db
      .from("loyalty_accounts")
      .select("*")
      .eq("customer_id", event.customer_id)
      .eq("program_id", event.program_id)
      .single();

    if (account) {
      const wasRewardEarned = event.event_type === "reward_earned";
      await db
        .from("loyalty_accounts")
        .update({
          current_punches: Math.max(0, account.current_punches - event.punches_delta),
          lifetime_punches: Math.max(0, account.lifetime_punches - event.punches_delta),
          ...(wasRewardEarned
            ? { rewards_earned: Math.max(0, account.rewards_earned - 1) }
            : {}),
        })
        .eq("id", account.id);
    }

    // Log undo event (don't delete original)
    await db.from("scan_events").insert({
      business_id: event.business_id,
      customer_id: event.customer_id,
      program_id: event.program_id,
      staff_user_id: user.id,
      event_type: "undo",
      punches_delta: -event.punches_delta,
      metadata: { undone_event_id: scanEventId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Undo error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
