import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("*")
      .eq("owner_user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "No business" }, { status: 404 });
    }

    const { data: program } = await db
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ business, program: program ?? null });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
