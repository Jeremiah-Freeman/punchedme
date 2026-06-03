import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "Missing phone" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: business } = await db
      .from("businesses")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "No business" }, { status: 404 });
    }

    const normalized = normalizePhone(phone);

    const { data: customer } = await db
      .from("customers")
      .select("public_token, first_name")
      .eq("business_id", business.id)
      .eq("normalized_phone", normalized)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ token: customer.public_token, name: customer.first_name });
  } catch (err) {
    console.error("Lookup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
