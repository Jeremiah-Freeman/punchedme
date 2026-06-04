import type { SupabaseClient } from "@supabase/supabase-js";

export type LocationCoords = { latitude: number; longitude: number };

/**
 * All known coordinates for a business: every row in business_locations,
 * falling back to the legacy businesses.latitude/longitude column if the
 * table has no rows (or doesn't exist yet).
 */
export async function getBusinessCoords(
  db: SupabaseClient,
  businessId: string,
  fallback?: { latitude?: number | null; longitude?: number | null }
): Promise<LocationCoords[]> {
  try {
    const { data } = await db
      .from("business_locations")
      .select("latitude, longitude")
      .eq("business_id", businessId);

    const coords = (data ?? [])
      .filter(
        (l): l is { latitude: number; longitude: number } =>
          l.latitude != null && l.longitude != null
      )
      .map((l) => ({ latitude: l.latitude, longitude: l.longitude }));

    if (coords.length > 0) return coords;
  } catch {
    // table missing or query failed — fall through to legacy column
  }

  if (fallback?.latitude != null && fallback?.longitude != null) {
    return [{ latitude: fallback.latitude, longitude: fallback.longitude }];
  }
  return [];
}
