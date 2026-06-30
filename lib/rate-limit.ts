import type { SupabaseClient } from "@supabase/supabase-js";

// Best client IP for rate-limit keying. On Vercel x-forwarded-for is set.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Sliding-window rate limiter backed by a Supabase table, so it works across
// serverless lambdas (no shared memory). Returns true if the request is allowed.
//
// Fails OPEN: if the limiter's own DB calls error, we never block a legitimate
// user — abuse prevention should not become an availability risk.
export async function checkRateLimit(
  db: SupabaseClient,
  bucket: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    const { count } = await db
      .from("rate_limit_hits")
      .select("bucket", { count: "exact", head: true })
      .eq("bucket", bucket)
      .gte("created_at", since);
    if ((count ?? 0) >= max) return false;
    await db.from("rate_limit_hits").insert({ bucket });
    // Opportunistically prune this bucket's expired rows to keep the table small.
    await db.from("rate_limit_hits").delete().eq("bucket", bucket).lt("created_at", since);
    return true;
  } catch {
    return true;
  }
}
