import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Never cache; Stripe POSTs raw bodies we must read verbatim for signature check.
export const dynamic = "force-dynamic";

type Db = ReturnType<typeof createAdminClient>;

// Resolve the business id from event metadata, falling back to the Stripe
// customer id (set on the business row during checkout).
async function resolveBusinessId(
  db: Db,
  metaId: string | undefined,
  customerId: string | null,
): Promise<string | null> {
  if (metaId) return metaId;
  if (customerId) {
    const { data } = await db
      .from("businesses")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return data?.id ?? null;
  }
  return null;
}

// Flip a business to a paid plan and move its display order into fulfillment.
async function activatePlan(
  db: Db,
  businessId: string,
  plan: string,
  customerId: string | null,
  subscriptionId: string | null,
) {
  await db
    .from("businesses")
    .update({
      plan_type: plan,
      plan_status: "starter_active",
      payment_status: "active",
      stripe_customer_id: customerId ?? undefined,
      stripe_subscription_id: subscriptionId ?? undefined,
      display_status: "preparing",
    })
    .eq("id", businessId);

  // Advance the most recent display order to "preparing" so it enters fulfillment.
  const { data: order } = await db
    .from("display_orders")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (order) {
    await db.from("display_orders").update({ status: "preparing" }).eq("id", order.id);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature");
  if (!secret || !sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripe: Stripe;
  let event: Stripe.Event;
  const body = await request.text();
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const businessId = await resolveBusinessId(
          db,
          s.metadata?.businessId,
          (s.customer as string) ?? null,
        );
        const plan = (s.metadata?.plan as string) ?? "starter";
        if (businessId) {
          await activatePlan(
            db,
            businessId,
            plan,
            (s.customer as string) ?? null,
            (s.subscription as string) ?? null,
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const businessId = await resolveBusinessId(
          db,
          sub.metadata?.businessId,
          (sub.customer as string) ?? null,
        );
        if (businessId) {
          const paymentStatus =
            sub.status === "active" || sub.status === "trialing"
              ? "active"
              : sub.status === "past_due" || sub.status === "unpaid"
                ? "past_due"
                : "none";
          await db
            .from("businesses")
            .update({ payment_status: paymentStatus })
            .eq("id", businessId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const businessId = await resolveBusinessId(
          db,
          sub.metadata?.businessId,
          (sub.customer as string) ?? null,
        );
        if (businessId) {
          // Subscription gone — drop back to free so caps + UI reflect reality.
          await db
            .from("businesses")
            .update({
              plan_type: "free",
              plan_status: "free_active",
              payment_status: "none",
              stripe_subscription_id: null,
            })
            .eq("id", businessId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const businessId = await resolveBusinessId(db, undefined, (inv.customer as string) ?? null);
        if (businessId) {
          await db
            .from("businesses")
            .update({ payment_status: "past_due" })
            .eq("id", businessId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
