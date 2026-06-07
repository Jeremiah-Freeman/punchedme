import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import DisplayClient from "./DisplayClient";

export const revalidate = 3600; // re-fetch DB data every hour

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DisplayPage({ params }: Props) {
  const { slug } = await params;
  const db = createAdminClient();

  const { data: business } = await db
    .from("businesses")
    .select("id, name, brand_color, logo_url, slug")
    .eq("slug", slug)
    .single();

  if (!business) return notFound();

  const { data: program } = await db
    .from("loyalty_programs")
    .select("reward_name, punches_required")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .single();

  return (
    <DisplayClient
      slug={slug}
      businessName={business.name}
      brandColor={business.brand_color ?? "#6366f1"}
      logoUrl={(business as { logo_url?: string | null }).logo_url ?? null}
      rewardName={program?.reward_name ?? "Free reward"}
      punchesRequired={program?.punches_required ?? 10}
    />
  );
}
