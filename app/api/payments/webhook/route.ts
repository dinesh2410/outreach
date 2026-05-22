import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import DodoPayments from "dodopayments";

export const runtime = "nodejs";

let _client: DodoPayments | null = null;
function getWebhookClient(): DodoPayments {
  if (_client) return _client;
  _client = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    webhookKey: process.env.DODO_WEBHOOK_SECRET,
    environment: process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
  return _client;
}

function billingDurationMs(billing: string): number {
  return billing === "annual"
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let event;
    try {
      event = getWebhookClient().webhooks.unwrap(rawBody, { headers });
    } catch (err) {
      console.error("[webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const evt = event as unknown as Record<string, unknown>;
    const eventType = (evt.type as string) ?? (evt.event_type as string) ?? "";
    const data = (evt.data as Record<string, unknown>) ?? evt;
    const metadata = (data.metadata as Record<string, string>) ?? {};
    const { userId, planId, billing } = metadata;

    console.log(`[webhook] Event: ${eventType}, userId: ${userId}, plan: ${planId}`);

    if (!userId) {
      console.warn("[webhook] No userId in metadata, skipping");
      return NextResponse.json({ received: true });
    }

    const db = getAdminFirestore();
    const userRef = db.doc(`users/${userId}`);

    switch (eventType) {
      case "subscription.active": {
        const subscriptionId =
          (data.subscription_id as string) ??
          (data.id as string) ??
          "";
        const expiresAt = new Date(
          Date.now() + billingDurationMs(billing ?? "monthly"),
        ).toISOString();

        await userRef.update({
          plan: planId ?? "pro",
          planExpiresAt: expiresAt,
          dodoSubscriptionId: subscriptionId,
          dodoCustomerId: (data.customer_id as string) ?? "",
          billingInterval: billing ?? "monthly",
          updatedAt: new Date().toISOString(),
        });

        console.log(`[webhook] Upgraded ${userId} to ${planId}, expires ${expiresAt}`);
        break;
      }

      case "subscription.renewed": {
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const currentBilling = userData?.billingInterval ?? billing ?? "monthly";
        const expiresAt = new Date(
          Date.now() + billingDurationMs(currentBilling),
        ).toISOString();

        await userRef.update({
          planExpiresAt: expiresAt,
          updatedAt: new Date().toISOString(),
        });

        console.log(`[webhook] Renewed ${userId}, new expiry ${expiresAt}`);
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        await userRef.update({
          plan: "free",
          planExpiresAt: null,
          dodoSubscriptionId: null,
          billingInterval: null,
          updatedAt: new Date().toISOString(),
        });

        console.log(`[webhook] Downgraded ${userId} to free (${eventType})`);
        break;
      }

      case "subscription.failed":
      case "subscription.on_hold": {
        console.warn(`[webhook] Subscription issue for ${userId}: ${eventType}`);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
