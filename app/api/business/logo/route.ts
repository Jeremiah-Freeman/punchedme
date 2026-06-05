import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/business/logo
 * Body: { dataUrl: "data:image/png;base64,..." }
 * Client resizes the image before sending (max 512x512 PNG).
 * Uploads to the public 'logos' bucket and saves businesses.logo_url.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dataUrl } = (await request.json()) as { dataUrl?: string };
    const match = dataUrl?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: business } = await db
      .from("businesses")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();
    if (!business) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const path = `${business.id}/logo.${ext}`;
    const { error: uploadError } = await db.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: `image/${match[1]}`,
        upsert: true,
      });
    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = db.storage.from("logos").getPublicUrl(path);

    // Cache-bust so an updated logo shows immediately
    const logoUrl = `${publicUrl}?v=${Date.now()}`;

    await db.from("businesses").update({ logo_url: logoUrl }).eq("id", business.id);

    return NextResponse.json({ logoUrl });
  } catch (err) {
    console.error("Logo route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
