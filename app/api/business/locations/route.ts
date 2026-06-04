import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BusinessLocation = {
  id: string;
  business_id: string;
  label: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
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

async function getOwnedBusinessId(): Promise<string | null> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;
  const db = createAdminClient();
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();
  return business?.id ?? null;
}

// GET /api/business/locations — list this business's locations
export async function GET() {
  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data, error } = await db
    .from("business_locations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Locations list error:", error);
    return NextResponse.json({ locations: [] });
  }
  return NextResponse.json({ locations: data ?? [] });
}

// POST /api/business/locations — add a location (geocodes the address)
export async function POST(request: NextRequest) {
  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { address, label } = body as { address?: string; label?: string };
  if (!address?.trim()) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  const coords = await geocodeAddress(address);

  const db = createAdminClient();
  const { data: location, error } = await db
    .from("business_locations")
    .insert({
      business_id: businessId,
      label: label?.trim() || null,
      address: address.trim(),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Location create error:", error);
    return NextResponse.json(
      { error: "Failed to add location" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    location,
    geocoded: !!coords,
  });
}

// DELETE /api/business/locations?id= — remove a location
export async function DELETE(request: NextRequest) {
  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db
    .from("business_locations")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("Location delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
