import { getAdminFirestore } from "@/lib/firebase-admin";
import { ADMIN_EMAILS } from "@/lib/admins";

export const runtime = "nodejs";

interface CreateCouponRequest {
  code?: string;
  plan?: "pro" | "max";
  durationDays?: number;
  maxRedemptions?: number;
  note?: string;
  adminEmail?: string;
}

export async function POST(req: Request) {
  let body: CreateCouponRequest;
  try {
    body = (await req.json()) as CreateCouponRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.adminEmail || !ADMIN_EMAILS.some((e) => e.toLowerCase() === body.adminEmail!.toLowerCase())) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 4) {
    return Response.json({ error: "Coupon code must be at least 4 characters" }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "pro" && plan !== "max") {
    return Response.json({ error: 'Plan must be "pro" or "max"' }, { status: 400 });
  }

  const durationDays = body.durationDays ?? 30;
  const maxRedemptions = body.maxRedemptions ?? 1;

  const db = getAdminFirestore();
  const ref = db.collection("coupons").doc(code);
  const existing = await ref.get();
  if (existing.exists) {
    return Response.json({ error: `Coupon "${code}" already exists` }, { status: 409 });
  }

  const coupon = {
    id: code,
    plan,
    durationDays,
    maxRedemptions,
    redemptions: 0,
    createdBy: body.adminEmail,
    createdAt: new Date().toISOString(),
    active: true,
    note: body.note ?? "",
  };

  await ref.set(coupon);

  return Response.json({ coupon, message: `Coupon "${code}" created` });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const adminEmail = searchParams.get("adminEmail");

  if (!adminEmail || !ADMIN_EMAILS.some((e) => e.toLowerCase() === adminEmail.toLowerCase())) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = getAdminFirestore();
  const snap = await db.collection("coupons").orderBy("createdAt", "desc").get();
  const coupons = snap.docs.map((d) => d.data());

  return Response.json({ coupons });
}
