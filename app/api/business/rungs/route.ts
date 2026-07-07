import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateRungs } from "@/lib/punch-bank";

// Owner's reward menu (the "what can your regulars earn?" rungs). Owner-only.
// GET  /api/business/rungs?programId=...  → list rungs for a program
// PUT  /api/business/rungs                → replace the whole menu for a program

async function assertOwnsProgram(programId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const, db: null };

  const db = createAdminClient();
  const { data: prog } = await db
    .from("loyalty_programs")
    .select("id, businesses!inner(owner_user_id)")
    .eq("id", programId)
    .single();
  if (!prog) return { error: "Program not found", status: 404 as const, db: null };
  const biz = prog.businesses as unknown as { owner_user_id: string };
  if (biz.owner_user_id !== user.id) return { error: "Forbidden", status: 403 as const, db: null };
  return { error: null, status: 200 as const, db };
}

export async function GET(request: NextRequest) {
  try {
    const programId = request.nextUrl.searchParams.get("programId");
    if (!programId) return NextResponse.json({ error: "Missing programId" }, { status: 400 });

    const gate = await assertOwnsProgram(programId);
    if (!gate.db) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { data: rungs } = await gate.db
      .from("reward_rungs")
      .select("id, cost, reward_name, sort_order")
      .eq("program_id", programId)
      .order("cost", { ascending: true });

    return NextResponse.json({ rungs: rungs ?? [] });
  } catch (err) {
    console.error("Rungs GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, rungs } = body as {
      programId: string;
      rungs: { cost: number; rewardName: string }[];
    };
    if (!programId || !Array.isArray(rungs)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Ignore fully-blank rows the owner left empty in the form.
    const cleaned = rungs
      .map((r) => ({ cost: Number(r.cost), rewardName: (r.rewardName ?? "").trim() }))
      .filter((r) => r.rewardName !== "" || Number.isFinite(r.cost));

    const check = validateRungs(cleaned);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const gate = await assertOwnsProgram(programId);
    if (!gate.db) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const db = gate.db;

    // Replace the whole menu: clear then insert sorted. Small set (≤3), so a
    // delete+insert is simpler and safer than diffing, and rung ids aren't
    // referenced anywhere durable except redemptions (which set null on delete).
    await db.from("reward_rungs").delete().eq("program_id", programId);

    const sorted = [...cleaned].sort((a, b) => a.cost - b.cost);
    const { data: inserted, error } = await db
      .from("reward_rungs")
      .insert(
        sorted.map((r, i) => ({
          program_id: programId,
          cost: r.cost,
          reward_name: r.rewardName,
          sort_order: i,
        }))
      )
      .select("id, cost, reward_name, sort_order");

    if (error) {
      return NextResponse.json({ error: "Failed to save reward menu" }, { status: 500 });
    }

    return NextResponse.json({ rungs: inserted ?? [] });
  } catch (err) {
    console.error("Rungs PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
