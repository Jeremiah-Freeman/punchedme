import { NextRequest, NextResponse } from "next/server";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates a hosted Stripe Checkout session (mode=subscription) for Starter or
// Growth. Hosted Checkout auto-surfaces Apple Pay / Google Pay / Link as
// express buttons, so wallet users never touch a card form. Returns { url };
// the client redirects. The actual plan flip happens in the webhook.
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, shipNow, returnTo } = (await request.json()) as {
      plan: "starter" | "growth";
      shipNow?: boolean;
      returnTo?: "onboarding" | "dashboard";
    };

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json({ error: "Plan not configured" }, { status: 500 });
    }

    const db = createAdminClient();
    const { data: biz } = await db
      .from("businesses")
      .select("id, name, contact_email, contact_name, stripe_customer_id, stripe_subscription_id")
      .eq("owner_user_id", user.id)
      .single();
    if (!biz) return NextResponse.json({ error: "No business" }, { status: 403 });

    const stripe = getStripe();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.punched.me";

    // Plan SWITCH for an existing subscriber — modify the current subscription
    // in place (with proration) rather than starting a second one, which would
    // double-bill. Only a shop with no live subscription goes through Checkout.
    if (biz.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(biz.stripe_subscription_id as string);
        if (["active", "trialing", "past_due"].includes(sub.status)) {
          const item = sub.items.data[0];
          if (item && item.price?.id !== priceId) {
            await stripe.subscriptions.update(sub.id, {
              items: [{ id: item.id, price: priceId }],
              proration_behavior: "create_prorations",
              metadata: { businessId: biz.id, plan },
            });
            await db.from("businesses").update({ plan_type: plan }).eq("id", biz.id);
          }
          return NextResponse.json({ url: `${base}/dashboard/billing?switched=1` });
        }
      } catch (err) {
        // Stale/invalid subscription id — fall through to a fresh checkout.
        console.warn("subscription switch failed, starting fresh checkout:", err);
      }
    }

    // Reuse or create the Stripe customer for this business.
    let customerId = biz.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: biz.contact_email ?? user.email ?? undefined,
        name: biz.contact_name ?? biz.name ?? undefined,
        metadata: { businessId: biz.id },
      });
      customerId = customer.id;
      await db.from("businesses").update({ stripe_customer_id: customerId }).eq("id", biz.id);
    }

    const onboarding = returnTo === "onboarding";
    const successPath = onboarding
      ? "/onboarding/success?checkout=success"
      : "/dashboard?checkout=success";
    const cancelPath = onboarding
      ? "/onboarding?checkout=cancelled"
      : "/dashboard?checkout=cancelled";

    const buildSession = (cust: string) =>
      stripe.checkout.sessions.create({
        mode: "subscription",
        customer: cust,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${base}${successPath}`,
        cancel_url: `${base}${cancelPath}`,
        metadata: { businessId: biz.id, plan, shipNow: shipNow ? "1" : "0" },
        // Mirror onto the subscription so subscription.* events can resolve the business.
        subscription_data: { metadata: { businessId: biz.id, plan } },
      });

    let session;
    try {
      session = await buildSession(customerId);
    } catch (err) {
      // Self-heal a stale/invalid stored customer (e.g. a test-mode id after a
      // switch to live, or a deleted customer): mint a fresh one and retry once.
      const code = (err as { code?: string })?.code;
      if (code === "resource_missing") {
        const customer = await stripe.customers.create({
          email: biz.contact_email ?? user.email ?? undefined,
          name: biz.contact_name ?? biz.name ?? undefined,
          metadata: { businessId: biz.id },
        });
        await db.from("businesses").update({ stripe_customer_id: customer.id }).eq("id", biz.id);
        session = await buildSession(customer.id);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
