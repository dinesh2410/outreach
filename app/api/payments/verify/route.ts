import { NextRequest, NextResponse } from "next/server";
import { getDodoClient } from "@/lib/dodo";

export const runtime = "nodejs";

function billingDurationMs(billing: string): number {
  return billing === "annual"
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, planId, billing } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const client = getDodoClient();
    const session = await client.checkoutSessions.retrieve(sessionId);

    if (session.payment_status !== "succeeded") {
      return NextResponse.json({
        verified: false,
        status: session.payment_status ?? "unknown",
      });
    }

    const plan = planId ?? "pro";
    const interval = billing ?? "monthly";
    const planExpiresAt = new Date(
      Date.now() + billingDurationMs(interval),
    ).toISOString();

    return NextResponse.json({
      verified: true,
      plan,
      billing: interval,
      planExpiresAt,
      paymentId: session.payment_id,
    });
  } catch (err) {
    console.error("[payments/verify] Error:", err);
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
