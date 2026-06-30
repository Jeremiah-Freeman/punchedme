import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Opens the Stripe billing portal so a shop can update their card, view
// invoices, or cancel. Lazily creates a default portal configuration the first
// time so no manual Stripe dashboard setup is ever needed.
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = createAdminClient();
    const { data: biz } = await db
      .from("businesses")
      .select("id, stripe_customer_id")
      .eq("owner_user_id", user.id)
      .single();
    if (!biz?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
    }

    const stripe = getStripe();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.punched.me";
    const customer = biz.stripe_customer_id as string;

    const open = () =>
      stripe.billingPortal.sessions.create({
        customer,
        return_url: `${base}/dashboard/billing`,
      });

    let session;
    try {
      session = await open();
    } catch (err) {
      // First use on this account: no default portal configuration exists yet.
      const msg = (err as { message?: string })?.message ?? "";
      if (/configuration/i.test(msg)) {
        await stripe.billingPortal.configurations.create({
          business_profile: { headline: "Punched — manage your subscription" },
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true },
          },
        });
        session = await open();
      } else {
        throw err;
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe portal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
