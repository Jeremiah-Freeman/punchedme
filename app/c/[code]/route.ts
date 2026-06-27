import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The /c/<code> sticker router. A single physical sticker is "dumb" — it always
// points here. This handler flips its meaning based on whether the code is
// claimed yet:
//   • unknown code        → home (not one of ours)
//   • claimed             → that business's customer join/punch flow
//   • unclaimed + owner    → claim it to the logged-in owner's business now
//   • unclaimed + guest    → stash the code and send to signup; business-create
//                            claims it once their shop is created
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const origin = request.nextUrl.origin;
  const db = createAdminClient();

  const { data: sticker } = await db
    .from("sticker_codes")
    .select("code, business_id")
    .eq("code", code)
    .single();

  // Unknown code — not one of our stickers.
  if (!sticker) {
    return NextResponse.redirect(new URL("/?sticker=unknown", origin));
  }

  // Already claimed → customer-facing join/punch flow for that shop.
  if (sticker.business_id) {
    const { data: biz } = await db
      .from("businesses")
      .select("slug")
      .eq("id", sticker.business_id)
      .single();
    return NextResponse.redirect(
      new URL(biz?.slug ? `/b/${biz.slug}/join` : "/", origin)
    );
  }

  // Unclaimed. If a logged-in owner is scanning, bind it to their business now
  // (lets an existing shop activate extra stickers without re-onboarding).
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (user) {
    const { data: ownBiz } = await db
      .from("businesses")
      .select("id, slug")
      .eq("owner_user_id", user.id)
      .single();
    if (ownBiz) {
      await db
        .from("sticker_codes")
        .update({ business_id: ownBiz.id, claimed_at: new Date().toISOString() })
        .eq("code", code)
        .is("business_id", null);
      return NextResponse.redirect(
        new URL(`/b/${ownBiz.slug}/join?claimed=1`, origin)
      );
    }
  }

  // Brand-new owner: stash the code and send them to sign up. business-create
  // reads this cookie and claims the code to their new shop.
  const res = NextResponse.redirect(new URL("/auth/signup", origin));
  res.cookies.set("pending_sticker_code", code, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
  return res;
}
