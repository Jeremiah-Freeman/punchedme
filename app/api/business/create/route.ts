import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { "User-Agent": "Punched.me/1.0 (loyalty@punched.me)" } }
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

    // Auto-create owner staff record
    await db.from("staff_users").insert({
      business_id: business.id,
      user_id: user.id,
      name: user.email ?? "Owner",
      role: "owner",
    });

    return NextResponse.json({ business });
  } catch (err) {
    console.error("Business create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
