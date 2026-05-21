import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

interface RedeemRequest {
  code?: string;
  userId?: string;
  userEmail?: string;
}

export async function POST(req: Request) {
  let body: RedeemRequest;
  try {
    body = (await req.json()) as RedeemRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const userId = body.userId?.trim();
  const userEmail = body.userEmail?.trim();

  if (!code) return Response.json({ error: "Missing coupon code" }, { status: 400 });
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

  const db = getAdminFirestore();
  const couponRef = db.collection("coupons").doc(code);
  const userRef = db.collection("users").doc(userId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const couponSnap = await tx.get(couponRef);
      if (!couponSnap.exists) {
        return { error: "Invalid coupon code", status: 404 };
      }

      const coupon = couponSnap.data()!;

      if (!coupon.active) {
        return { error: "This coupon is no longer active", status: 410 };
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return { error: "This coupon has expired", status: 410 };
      }

      if (coupon.maxRedemptions > 0 && (coupon.redemptions ?? 0) >= coupon.maxRedemptions) {
        return { error: "This coupon has reached its redemption limit", status: 410 };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        return { error: "User not found", status: 404 };
      }

      const userData = userSnap.data()!;
      if (userData.couponCode === code) {
        return { error: "You've already redeemed this coupon", status: 409 };
      }

      const plan = coupon.plan as "pro" | "max";
      const durationDays = coupon.durationDays as number;

      let planExpiresAt: string | undefined;
      if (durationDays > 0) {
        planExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      }

      tx.update(couponRef, {
        redemptions: FieldValue.increment(1),
      });

      const planUpdate: Record<string, unknown> = {
        plan,
        couponCode: code,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (planExpiresAt) planUpdate.planExpiresAt = planExpiresAt;
      tx.update(userRef, planUpdate);

      const redemptionRef = db.collection("couponRedemptions").doc();
      tx.set(redemptionRef, {
        couponId: code,
        userId,
        userEmail: userEmail ?? "",
        plan,
        durationDays,
        redeemedAt: new Date().toISOString(),
      });

      return {
        plan,
        planExpiresAt: planExpiresAt ?? null,
        message: durationDays > 0
          ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated for ${durationDays} days!`
          : `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`,
      };
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (err) {
    console.error("[/api/redeem-coupon] transaction failed:", err);
    return Response.json(
      { error: "Failed to redeem coupon. Please try again." },
      { status: 500 },
    );
  }
}
