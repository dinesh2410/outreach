import { NextRequest, NextResponse } from "next/server";
import { getDodoClient, getProductId } from "@/lib/dodo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { planId, billing, userId, email, discountCode } = await req.json();

    if (!planId || !billing || !userId || !email) {
      return NextResponse.json(
        { error: "planId, billing, userId, and email are required" },
        { status: 400 },
      );
    }

    if (!["pro", "max"].includes(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["monthly", "annual"].includes(billing)) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const productId = getProductId(planId, billing);
    const client = getDodoClient();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email },
      return_url: `${baseUrl}/payments/success?plan=${planId}&billing=${billing}`,
      metadata: {
        userId,
        planId,
        billing,
      },
      ...(discountCode ? { discount_codes: [discountCode] } : {}),
    });

    return NextResponse.json({
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
    });
  } catch (err) {
    console.error("[payments/create-subscription] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
