"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { updateUserPlan } from "@/lib/firestore";

function SuccessContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const plan = params.get("plan") ?? "pro";
  const billing = params.get("billing") ?? "monthly";
  const [status, setStatus] = useState<"verifying" | "activated" | "failed">("verifying");
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    attempted.current = true;

    const sessionId = sessionStorage.getItem("dodo_session_id");
    if (!sessionId) {
      setStatus("failed");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, planId: plan, billing }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (data.verified && user) {
          await updateUserPlan(user.id, data.plan, data.planExpiresAt);
          sessionStorage.removeItem("dodo_session_id");
          setStatus("activated");
          setTimeout(() => router.push("/dashboard"), 3000);
        } else {
          setStatus("failed");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [user, plan, billing, router]);

  return (
    <AppShell>
      <div className="mx-auto max-w-lg py-24 text-center">
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            </div>
            <h1 className="text-[24px] font-semibold text-ink">Verifying your payment…</h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              Please wait while we confirm your payment and activate your plan.
            </p>
          </>
        )}

        {status === "activated" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[24px] font-semibold text-ink">Payment successful!</h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              Your <span className="font-semibold text-ink capitalize">{plan}</span> plan is now active. Enjoy your upgraded tools and limits.
            </p>
            <p className="mt-6 text-[13px] text-ink-faint">
              Redirecting to dashboard…
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-night-soft"
            >
              Go to dashboard now
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-[24px] font-semibold text-ink">Couldn&apos;t verify payment</h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              Your payment may still be processing. If your plan doesn&apos;t update within a few minutes, please contact support.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-night-soft"
              >
                Go to dashboard
              </button>
              <a
                href="mailto:support@testerscommunity.com"
                className="rounded-full bg-cream-deep px-6 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-ink hover:text-white"
              >
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center py-32">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink-faint border-t-transparent" />
          </div>
        </AppShell>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
