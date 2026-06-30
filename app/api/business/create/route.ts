import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  try {
    const encoded = encodeURIComponent(address);
    // Cap the geocode at 4s — a slow/blocked Nominatim must never hang signup.
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: { "User-Agent": "Punched.me/1.0 (loyalty@punched.me)" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, brandColor, logoUrl, address } = body as {
      name: string;
      brandColor?: string;
      logoUrl?: string;
      address?: string;
    };

    if (!name) {
      return NextResponse.json({ error: "Business name required" }, { status: 400 });
    }

    const db = createAdminClient();

    // One business per owner. If they already have one (e.g. they wandered back
    // into onboarding from a pricing link), return it instead of creating a
    // duplicate — a second row would break the dashboard's single-business read.
    const { data: owned } = await db
      .from("businesses")
      .select("id, slug")
      .eq("owner_user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (owned) {
      return NextResponse.json({ business: owned, existing: true });
    }

    // Generate unique slug
    let slug = slugify(name);
    const { data: existing } = await db
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Geocode address for location-based wallet notifications
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (address?.trim()) {
      const coords = await geocodeAddress(address);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    const { data: business, error } = await db
      .from("businesses")
      .insert({
        name: name.trim(),
        slug,
        brand_color: brandColor ?? "#6366f1",
        logo_url: logoUrl ?? null,
        owner_user_id: user.id,
        address: address?.trim() ?? null,
        latitude,
        longitude,
      })
      .select()
      .single();

    if (error) {
      console.error("Business create error:", error);
      return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
    }

    // Seed first location from the onboarding address (best-effort)
    if (address?.trim()) {
      try {
        await db.from("business_locations").insert({
          business_id: business.id,
          address: address.trim(),
          latitude,
          longitude,
        });
      } catch (e) {
        console.error("Seed location error:", e);
      }
    }

    // Auto-create owner staff record
    await db.from("staff_users").insert({
      business_id: business.id,
      user_id: user.id,
      name: user.email ?? "Owner",
      role: "owner",
    });

    // If they arrived via a /c/<code> sticker, claim that code to this new shop.
    const pendingCode = request.cookies.get("pending_sticker_code")?.value;
    let claimedCode = false;
    if (pendingCode) {
      const { error: claimErr } = await db
        .from("sticker_codes")
        .update({ business_id: business.id, claimed_at: new Date().toISOString() })
        .eq("code", pendingCode)
        .is("business_id", null);
      if (!claimErr) claimedCode = true;
    }

    const response = NextResponse.json({ business });
    if (claimedCode) {
      response.cookies.set("pending_sticker_code", "", { maxAge: 0, path: "/" });
    }
    return response;
  } catch (err) {
    console.error("Business create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
