"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import {
  Check,
  X,
  Lock,
  Sparkles,
  Star,
  Loader2,
  ArrowRight,
  Key,
  Send,
  Users,
  Zap,
  Tag,
} from "@/components/shared/Icon";
import {
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_PRICING,
  type PlanId,
  type PlanLimits,
} from "@/lib/plan-limits";

type Billing = "monthly" | "annual";

interface TierConfig {
  id: PlanId | "enterprise";
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  popular?: boolean;
  cta: string;
  limits: PlanLimits | null;
}

const TIERS: TierConfig[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started — no card needed",
    monthly: 0,
    annual: 0,
    cta: "Current plan",
    limits: PLAN_LIMITS.free,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious indie devs",
    monthly: PLAN_PRICING.pro.monthly,
    annual: PLAN_PRICING.pro.annual,
    popular: true,
    cta: "Upgrade to Pro",
    limits: PLAN_LIMITS.pro,
  },
  {
    id: "max",
    name: "Max",
    tagline: "Power users & small studios",
    monthly: PLAN_PRICING.max.monthly,
    annual: PLAN_PRICING.max.annual,
    cta: "Upgrade to Max",
    limits: PLAN_LIMITS.max,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Agencies & teams",
    monthly: -1,
    annual: -1,
    cta: "Contact us",
    limits: null,
  },
];

const FEATURE_ROWS: {
  label: string;
  tooltip?: string;
  render: (limits: PlanLimits | null, tier: TierConfig["id"]) => React.ReactNode;
}[] = [
  {
    label: "ASO Score Checker",
    render: () => <FeatureUnlimited />,
  },
  {
    label: "ASO Generator",
    render: (l) => (l ? <FeatureQuota n={l.generator} suffix="/mo" /> : <FeatureCustom />),
  },
  {
    label: "Reddit Demand",
    render: (l, tier) =>
      l ? (
        <div className="flex flex-col items-center gap-0.5">
          <FeatureQuota n={l.reddit} suffix="/mo" />
          {l.redditPreviewOnly && (
            <span className="text-[10px] text-ink-faint">Preview only</span>
          )}
        </div>
      ) : (
        <FeatureCustom />
      ),
  },
  {
    label: "Competitor Watch",
    render: (l) =>
      l ? (
        l.competitor === 0 ? <FeatureLocked /> : <FeatureQuota n={l.competitor} suffix="/mo" />
      ) : (
        <FeatureCustom />
      ),
  },
  {
    label: "Keyword Rank",
    render: (l) =>
      l ? (
        <div className="flex flex-col items-center gap-0.5">
          <FeatureQuota n={l.keywordRank} suffix="/mo" />
          {l.keywordRankBasicOnly && (
            <span className="text-[10px] text-ink-faint">Basic only</span>
          )}
        </div>
      ) : (
        <FeatureCustom />
      ),
  },
  {
    label: "Review Intelligence",
    render: (l) =>
      l ? (
        l.reviewIntel === 0 ? <FeatureLocked /> : <FeatureQuota n={l.reviewIntel} suffix="/mo" />
      ) : (
        <FeatureCustom />
      ),
  },
  {
    label: "AI Strategic Insights",
    render: (l) =>
      l ? (l.aiInsights ? <FeatureCheck /> : <FeatureX />) : <FeatureCheck />,
  },
  {
    label: "Saved Apps",
    render: (l) =>
      l ? <FeatureQuota n={l.maxApps} /> : <FeatureUnlimited />,
  },
  {
    label: "History Retention",
    render: (l) =>
      l ? (
        l.historyDays === Infinity ? (
          <span className="text-[13px] font-semibold text-ink">Forever</span>
        ) : (
          <span className="text-[13px] font-semibold text-ink">{l.historyDays} days</span>
        )
      ) : (
        <span className="text-[13px] font-semibold text-ink">Forever</span>
      ),
  },
  {
    label: "Saved Drafts",
    render: (l) =>
      l ? <FeatureQuota n={l.maxSavedDrafts} /> : <FeatureUnlimited />,
  },
  {
    label: "Export",
    render: (l, tier) => {
      if (!l) return <span className="text-[12px] text-ink-muted">White-label</span>;
      const fmt = l.exportFormats.map((f) => f === "clipboard" ? "Clipboard" : f.toUpperCase()).join(", ");
      return <span className="text-[12px] text-ink-muted">{fmt}</span>;
    },
  },
  {
    label: "Priority Processing",
    render: (l, tier) => {
      if (tier === "enterprise") return <span className="text-[12px] text-ink-muted">Dedicated</span>;
      if (tier === "max") return <span className="text-[12px] font-semibold text-ink">Top priority</span>;
      if (tier === "pro") return <FeatureCheck />;
      return <FeatureX />;
    },
  },
];

export default function PricingPage() {
  const { user, plan, redeemCoupon, loading: authLoading } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [dodoReady, setDodoReady] = useState(false);

  const effectivePlan = user ? plan : "free";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.dodopayments.com/checkout.js";
    script.async = true;
    script.onload = () => setDodoReady(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleUpgrade = useCallback(
    async (planId: "pro" | "max") => {
      if (!user) {
        router.push("/auth?next=%2Fpricing");
        return;
      }
      if (upgradingPlan) return;
      setUpgradingPlan(planId);
      try {
        const res = await fetch("/api/payments/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            billing,
            userId: user.id,
            email: user.email,
            discountCode: discountCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          push(data.error ?? "Failed to create subscription");
          return;
        }
        if (data.sessionId) {
          sessionStorage.setItem("dodo_session_id", data.sessionId);
        }
        if (data.checkoutUrl && dodoReady && (window as unknown as Record<string, unknown>).DodoPayments) {
          const Dodo = (window as unknown as Record<string, { Initialize: (opts: unknown) => void; Checkout: { open: (opts: unknown) => void } }>).DodoPayments;
          Dodo.Initialize({ mode: process.env.NEXT_PUBLIC_DODO_MODE === "live" ? "live" : "test", displayType: "overlay" });
          Dodo.Checkout.open({ checkoutUrl: data.checkoutUrl });
        } else if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } catch {
        push("Something went wrong. Please try again.");
      } finally {
        setUpgradingPlan(null);
      }
    },
    [user, billing, discountCode, dodoReady, upgradingPlan, router, push],
  );

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim() || redeeming) return;
    if (!user) {
      push("Sign in first to redeem a coupon");
      router.push("/auth?next=%2Fpricing");
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCoupon(couponCode);
      if (result.success) {
        push(result.message, "success");
        setCouponCode("");
      } else {
        push(result.message);
      }
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <AppShell
      eyebrow="Plans & Pricing"
      title="Simple pricing, powerful tools"
      description="Start free. Upgrade when you need more. Every plan includes a 7-day Pro trial."
    >
      <div className="max-w-5xl mx-auto">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
              billing === "monthly"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
              billing === "annual"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Annual
            <span
              className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={
                billing === "annual"
                  ? { backgroundColor: "rgba(255,255,255,0.2)" }
                  : { backgroundColor: "#DCFCE7", color: "#16A34A" }
              }
            >
              Save 20%+
            </span>
          </button>
        </div>

        {/* Discount code */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center gap-2 rounded-full bg-paper border border-line px-4 py-2.5">
            <Tag size={14} className="text-ink-faint shrink-0" />
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Discount code"
              className="w-36 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
            {discountCode.trim() && (
              <span className="text-[11px] font-semibold text-emerald-600 shrink-0">Applied at checkout</span>
            )}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              billing={billing}
              currentPlan={effectivePlan}
              isLoggedIn={!!user}
              onUpgrade={handleUpgrade}
              upgrading={upgradingPlan === tier.id}
            />
          ))}
        </div>

        {/* Feature comparison table */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl tile-lilac flex items-center justify-center">
              <Sparkles size={16} strokeWidth={1.85} />
            </div>
            <div>
              <p className="eyebrow">Feature comparison</p>
              <h2
                className="text-[22px] font-semibold tracking-[-0.01em]"
                style={{ color: "#0B3D7A" }}
              >
                Everything at a glance
              </h2>
            </div>
          </div>

          <div className="card-soft overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-line-soft">
                  <th className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint px-5 py-4 w-[180px]">
                    Feature
                  </th>
                  {TIERS.map((tier) => (
                    <th
                      key={tier.id}
                      className={`text-center text-[13px] font-semibold px-4 py-4 ${
                        tier.popular ? "text-white" : "text-ink"
                      }`}
                      style={tier.popular ? { color: "#2563EB" } : undefined}
                    >
                      {tier.name}
                      {tier.popular && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: "#2563EB" }}>
                          Popular
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-line-soft last:border-0">
                    <td className="text-[13px] text-ink-muted px-5 py-3.5">{row.label}</td>
                    {TIERS.map((tier) => (
                      <td key={tier.id} className="text-center px-4 py-3.5">
                        {row.render(tier.limits, tier.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Coupon redemption */}
        <section id="coupon" className="mb-12 scroll-mt-24">
          <div className="card-soft p-7 max-w-xl mx-auto" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FEF9C3 100%)" }}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl tile-cream flex items-center justify-center shrink-0">
                <Key size={16} strokeWidth={1.85} />
              </div>
              <div>
                <p className="eyebrow">Have a coupon?</p>
                <h3
                  className="text-[18px] font-semibold tracking-[-0.01em] mt-1"
                  style={{ color: "#0B3D7A" }}
                >
                  Redeem your code
                </h3>
                <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
                  Enter a coupon code to activate Pro or Max access. Codes are case-insensitive.
                </p>
              </div>
            </div>
            <form onSubmit={handleRedeem} className="flex items-center gap-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
                className="flex-1 px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={!couponCode.trim() || redeeming}
                className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {redeeming ? (
                  <>
                    <Loader2 size={14} className="animate-spin-slow" />
                    Redeeming…
                  </>
                ) : (
                  <>
                    <Zap size={14} strokeWidth={2} />
                    Redeem
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl tile-mint flex items-center justify-center">
              <Star size={16} strokeWidth={1.85} />
            </div>
            <div>
              <p className="eyebrow">Questions</p>
              <h2
                className="text-[22px] font-semibold tracking-[-0.01em]"
                style={{ color: "#0B3D7A" }}
              >
                Frequently asked
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FaqCard
              q="What happens after the 7-day trial?"
              a="You drop to the Free plan automatically — no charge. You keep your data, but premium tools (Competitor Watch, Review Intelligence) become locked and usage limits reset to free-tier levels."
            />
            <FaqCard
              q="Can I change plans later?"
              a="Yes. Upgrade or downgrade anytime. When you upgrade, your new limits take effect immediately. When you downgrade, you keep access until the current billing period ends."
            />
            <FaqCard
              q="What's the difference between Pro and Max?"
              a="Max gives you 3x+ the generation limits, unlimited keyword checks, and priority processing. It's designed for developers managing 5+ apps or freelance ASO consultants."
            />
            <FaqCard
              q="Do you offer refunds?"
              a="Yes — if you're unsatisfied within the first 14 days of a paid plan, email us at support@testerscommunity.com for a full refund. No questions asked."
            />
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="card-soft p-8 text-center" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F2ECFE 100%)" }}>
          <div className="w-12 h-12 rounded-xl tile-lilac flex items-center justify-center mx-auto mb-4">
            <Users size={18} strokeWidth={1.85} />
          </div>
          <h2
            className="text-[24px] font-semibold tracking-[-0.01em] mb-2"
            style={{ color: "#0B3D7A" }}
          >
            Need a custom plan?
          </h2>
          <p className="text-[14px] text-ink-muted leading-relaxed mb-6 max-w-md mx-auto">
            For agencies, studios, and teams managing large app portfolios. Custom limits, team seats, API access, and white-label reports.
          </p>
          <a
            href="mailto:support@testerscommunity.com?subject=ReachFront%20Enterprise%20Inquiry"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            <Send size={14} strokeWidth={2} />
            Contact us
          </a>
        </section>
      </div>
    </AppShell>
  );
}

function TierCard({
  tier,
  billing,
  currentPlan,
  isLoggedIn,
  onUpgrade,
  upgrading,
}: {
  tier: TierConfig;
  billing: Billing;
  currentPlan: PlanId;
  isLoggedIn: boolean;
  onUpgrade: (planId: "pro" | "max") => void;
  upgrading: boolean;
}) {
  const isEnterprise = tier.id === "enterprise";
  const isCurrent = !isEnterprise && tier.id === currentPlan;
  const isTrial = currentPlan === "trial" && tier.id === "pro";
  const price = billing === "annual" ? tier.annual : tier.monthly;
  const isPaidTier = tier.id === "pro" || tier.id === "max";

  const ctaLabel = upgrading
    ? "Processing..."
    : isCurrent
      ? "Current plan"
      : isTrial && tier.id === "pro"
        ? "Active (trial)"
        : isEnterprise
          ? "Contact us"
          : tier.cta;

  const ctaDisabled = isCurrent || isTrial || upgrading;

  const ctaHref = isEnterprise
    ? "mailto:support@testerscommunity.com?subject=ReachFront%20Enterprise%20Inquiry"
    : !isLoggedIn && isPaidTier
      ? "/auth?next=%2Fpricing"
      : undefined;

  return (
    <div
      className={`card-soft p-6 flex flex-col relative ${
        tier.popular ? "ring-2" : ""
      }`}
      style={tier.popular ? { boxShadow: "0 0 0 2px #2563EB" } : undefined}
    >
      {tier.popular && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-white"
          style={{ backgroundColor: "#2563EB" }}
        >
          Most popular
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-[18px] font-semibold text-ink">{tier.name}</h3>
        <p className="text-[12px] text-ink-muted mt-1">{tier.tagline}</p>
      </div>

      <div className="mb-6">
        {isEnterprise ? (
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-bold text-ink tracking-tight">Custom</span>
          </div>
        ) : price === 0 ? (
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] font-bold text-ink tracking-tight">$0</span>
            <span className="text-[13px] text-ink-faint">forever</span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-ink tracking-tight">${price}</span>
              <span className="text-[13px] text-ink-faint">/mo</span>
            </div>
            {billing === "annual" && (
              <p className="text-[11px] text-ink-faint mt-0.5">
                ${price * 12}/year · billed annually
              </p>
            )}
            {billing === "monthly" && tier.annual > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: "#16A34A" }}>
                ${tier.annual}/mo if billed annually
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 mb-6">
        <HighlightList tier={tier} />
      </div>

      {ctaHref ? (
        <a
          href={ctaHref}
          className={`block w-full text-center px-5 py-3 rounded-full text-[14px] font-medium transition-colors ${
            tier.popular
              ? "text-white hover:opacity-90"
              : "bg-cream-deep text-ink hover:bg-ink hover:text-white"
          }`}
          style={tier.popular ? { backgroundColor: "#2563EB" } : undefined}
        >
          {ctaLabel}
        </a>
      ) : (
        <button
          disabled={ctaDisabled}
          onClick={() => {
            if (isPaidTier && !ctaDisabled) onUpgrade(tier.id as "pro" | "max");
          }}
          className={`w-full px-5 py-3 rounded-full text-[14px] font-medium transition-colors ${
            tier.popular
              ? "text-white hover:opacity-90"
              : ctaDisabled
                ? "bg-cream-deep text-ink-faint cursor-not-allowed"
                : "bg-cream-deep text-ink hover:bg-ink hover:text-white"
          } disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2`}
          style={tier.popular && !ctaDisabled ? { backgroundColor: "#2563EB" } : tier.popular && ctaDisabled ? { backgroundColor: "#2563EB" } : undefined}
        >
          {upgrading && <Loader2 size={14} className="animate-spin" />}
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function HighlightList({ tier }: { tier: TierConfig }) {
  const highlights: string[] = [];

  if (tier.id === "free") {
    highlights.push(
      "ASO Score Checker — unlimited",
      "3 ASO generations/mo",
      "3 Reddit analyses (preview)",
      "Basic keyword ranking",
      "1 saved app",
      "30-day history",
    );
  } else if (tier.id === "pro") {
    highlights.push(
      "Everything in Free, plus:",
      "30 ASO generations/mo",
      "20 Reddit analyses (full)",
      "15 Competitor Watch/mo",
      "50 Keyword Rank checks/mo",
      "10 Review Intelligence/mo",
      "AI Strategic Insights",
      "10 saved apps",
      "Unlimited history",
    );
  } else if (tier.id === "max") {
    highlights.push(
      "Everything in Pro, plus:",
      "100 ASO generations/mo",
      "50 Reddit analyses/mo",
      "50 Competitor Watch/mo",
      "Unlimited keyword checks",
      "30 Review Intelligence/mo",
      "Unlimited saved apps",
      "Top priority processing",
      "PDF export",
    );
  } else {
    highlights.push(
      "Everything in Max, plus:",
      "Team seats & custom limits",
      "API access",
      "White-label reports",
      "Dedicated support",
      "Custom billing",
    );
  }

  return (
    <ul className="space-y-2">
      {highlights.map((h, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] text-ink leading-snug">
          {i === 0 && (tier.id === "pro" || tier.id === "max" || tier.id === "enterprise") ? (
            <ArrowRight size={13} className="mt-0.5 shrink-0 text-ink-faint" />
          ) : (
            <Check size={13} className="mt-0.5 shrink-0" style={{ color: "#16A34A" }} />
          )}
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureCheck() {
  return <Check size={16} style={{ color: "#16A34A" }} className="mx-auto" />;
}

function FeatureX() {
  return <X size={16} className="mx-auto text-ink-faint" />;
}

function FeatureLocked() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-faint">
      <Lock size={12} />
      Locked
    </span>
  );
}

function FeatureUnlimited() {
  return <span className="text-[13px] font-semibold text-ink">Unlimited</span>;
}

function FeatureQuota({ n, suffix }: { n: number; suffix?: string }) {
  if (n === Infinity) return <FeatureUnlimited />;
  return (
    <span className="text-[13px] font-semibold text-ink">
      {n}{suffix ?? ""}
    </span>
  );
}

function FeatureCustom() {
  return <span className="text-[12px] text-ink-muted">Custom</span>;
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="card-soft p-6">
      <p className="text-[14px] font-semibold text-ink mb-2">{q}</p>
      <p className="text-[13px] text-ink-muted leading-relaxed">{a}</p>
    </div>
  );
}
