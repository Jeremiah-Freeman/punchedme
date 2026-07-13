import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, name, rewardName, punchesRequired, punchCooldownMinutes, brandColor, headStart } = body as {
      businessId: string;
      name: string;
      rewardName: string;
      punchesRequired: number;
      punchCooldownMinutes: number;
      brandColor?: string;
      headStart?: number;
    };

    if (!businessId || !name || !rewardName || !punchesRequired) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify ownership
    const { data: biz } = await db
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_user_id", user.id)
      .single();

    if (!biz) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update brand color if provided (picked on this step now)
    if (brandColor) {
      await db.from("businesses").update({ brand_color: brandColor }).eq("id", businessId);
    }

    // Deactivate existing programs
    await db
      .from("loyalty_programs")
      .update({ is_active: false })
      .eq("business_id", businessId);

    // Create new program
    const { data: program, error } = await db
      .from("loyalty_programs")
      .insert({
        business_id: businessId,
        name: name.trim(),
        reward_name: rewardName.trim(),
        punches_required: punchesRequired,
        punch_cooldown_minutes: punchCooldownMinutes ?? 1440,
        head_start: headStart ?? 3,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
    }

    return NextResponse.json({ program });
  } catch (err) {
    console.error("Program create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { programId, ...updates } = body as {
      programId: string;
      name?: string;
      rewardName?: string;
      punchesRequired?: number;
      punchCooldownMinutes?: number;
      headStart?: number;
      isActive?: boolean;
    };

    const db = createAdminClient();

    // Verify ownership through program → business
    const { data: prog } = await db
      .from("loyalty_programs")
      .select("id, businesses!inner(owner_user_id)")
      .eq("id", programId)
      .single();

    if (!prog) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const biz = prog.businesses as unknown as { owner_user_id: string };
    if (biz.owner_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: updated } = await db
      .from("loyalty_programs")
      .update({
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.rewardName ? { reward_name: updates.rewardName } : {}),
        ...(updates.punchesRequired !== undefined
          ? { punches_required: updates.punchesRequired }
          : {}),
        ...(updates.punchCooldownMinutes !== undefined
          ? { punch_cooldown_minutes: updates.punchCooldownMinutes }
          : {}),
        ...(updates.headStart !== undefined ? { head_start: updates.headStart } : {}),
        ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
      })
      .eq("id", programId)
      .select()
      .single();

    return NextResponse.json({ program: updated });
  } catch (err) {
    console.error("Program update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
