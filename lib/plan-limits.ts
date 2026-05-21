export type PlanId = "free" | "pro" | "max" | "trial";

export type QuotaTool =
  | "generator"
  | "reddit"
  | "competitor"
  | "keywordRank"
  | "reviewIntel"
  | "buzzTracker";

export interface PlanLimits {
  generator: number;
  reddit: number;
  redditPreviewOnly: boolean;
  competitor: number;
  keywordRank: number;
  keywordRankBasicOnly: boolean;
  reviewIntel: number;
  buzzTracker: number;
  aiInsights: boolean;
  maxApps: number;
  maxSavedDrafts: number;
  historyDays: number;
  exportFormats: ("clipboard" | "markdown" | "csv" | "pdf")[];
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    generator: 3,
    reddit: 3,
    redditPreviewOnly: true,
    competitor: 0,
    keywordRank: 5,
    keywordRankBasicOnly: true,
    reviewIntel: 0,
    buzzTracker: 1,
    aiInsights: false,
    maxApps: 1,
    maxSavedDrafts: 5,
    historyDays: 30,
    exportFormats: ["clipboard"],
  },
  trial: {
    generator: 30,
    reddit: 20,
    redditPreviewOnly: false,
    competitor: 15,
    keywordRank: 50,
    keywordRankBasicOnly: false,
    reviewIntel: 10,
    buzzTracker: 3,
    aiInsights: true,
    maxApps: 10,
    maxSavedDrafts: Infinity,
    historyDays: Infinity,
    exportFormats: ["clipboard", "markdown", "csv"],
  },
  pro: {
    generator: 30,
    reddit: 20,
    redditPreviewOnly: false,
    competitor: 15,
    keywordRank: 50,
    keywordRankBasicOnly: false,
    reviewIntel: 10,
    buzzTracker: 5,
    aiInsights: true,
    maxApps: 10,
    maxSavedDrafts: Infinity,
    historyDays: Infinity,
    exportFormats: ["clipboard", "markdown", "csv"],
  },
  max: {
    generator: 100,
    reddit: 50,
    redditPreviewOnly: false,
    competitor: 50,
    keywordRank: Infinity,
    keywordRankBasicOnly: false,
    reviewIntel: 30,
    buzzTracker: 15,
    aiInsights: true,
    maxApps: Infinity,
    maxSavedDrafts: Infinity,
    historyDays: Infinity,
    exportFormats: ["clipboard", "markdown", "csv", "pdf"],
  },
};

export const PLAN_NAMES: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
  trial: "Pro Trial",
};

export const PLAN_PRICING: Record<PlanId, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 19, annual: 15 },
  max: { monthly: 39, annual: 29 },
  trial: { monthly: 0, annual: 0 },
};

export const TRIAL_DURATION_DAYS = 7;

export function getEffectivePlan(
  plan: PlanId,
  trialEndsAt?: string | null,
  planExpiresAt?: string | null,
): PlanId {
  const now = Date.now();

  if (plan === "trial") {
    if (trialEndsAt && new Date(trialEndsAt).getTime() < now) return "free";
    return "trial";
  }

  if (plan === "pro" || plan === "max") {
    if (planExpiresAt && new Date(planExpiresAt).getTime() < now) return "free";
    return plan;
  }

  return "free";
}

export function getLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId];
}
