import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated liveness/readiness probe for the uptime monitor.
// Returns 200 only when the app is serving AND the database is reachable;
// 503 otherwise so a heartbeat check can tell "site up" from "site broken".
// Never cached — every hit must reflect current state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  let dbOk = false;
  let dbError: string | null = null;
  try {
    // Cheapest possible round-trip that proves the DB answers: a HEAD-style
    // count against a tiny known table. Bounded by a timeout so a hung DB
    // can't hang the probe (and thus the monitor) indefinitely.
    const db = createAdminClient();
    const query = db
      .from("businesses")
      .select("id", { count: "exact", head: true });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("db timeout")), 4000)
    );

    const { error } = (await Promise.race([query, timeout])) as Awaited<
      typeof query
    >;
    if (error) throw error;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "unknown db error";
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    checks: { db: dbOk ? "ok" : "fail", ...(dbError ? { dbError } : {}) },
    latencyMs: Date.now() - startedAt,
    // Surfaced so a failing heartbeat issue shows which deploy was live.
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
