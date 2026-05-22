import type { PlanId, QuotaTool } from "./plan-limits";

export type Platform = "android" | "ios";

export type Category =
  | "Productivity"
  | "AI / ML"
  | "Dev tools"
  | "Game"
  | "Social"
  | "Lifestyle"
  | "Finance"
  | "Health & fitness"
  | "Other";

export interface GeneratorInput {
  platform: Platform[];
  appName: string;
  category: Category;
  features: string;
  audience?: string;
  tone: "professional" | "casual" | "playful" | "minimal";
  storeUrl?: string;
  clarifications?: ClarifyingAnswer[];
  primaryKeyword?: string;
  secondaryKeyword?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  why: string;
}

export interface KeywordCandidates {
  primary: string[];
  secondary: string[];
}

export interface ClarifyingAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface Variant {
  id: string;
  label: string;
  approach: "keyword";
  title: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc: string;
  keywords?: string[];
}

export interface GenerationResult {
  id: string;
  input: GeneratorInput;
  android?: Variant[];
  ios?: Variant[];
  createdAt: string;
  // Token / cost breakdown for the generation. Populated by /api/generate;
  // not persisted into history (recordHistory strips it) — it flows directly
  // to /users/{uid}/usage/{genId} via recordUsageForUser instead.
  usage?: {
    calls: UsageCall[];
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    elapsedMs: number;
  };
}

export interface AppEntry {
  id: string;
  name: string;
  category: Category;
  icon: string;
  generations: GenerationResult[];
  createdAt: string;
}

// "Your applications" — apps the user explicitly saved so they can be
// pre-selected as input across tools (Generator URL step, Score checker,
// Competitor target, Reddit-demand context). Different from AppEntry: this
// is a reusable INPUT reference, not a container for generations.
export interface MyApp {
  id: string;                 // deterministic hash of url
  name: string;               // editable
  source: "play" | "ios";
  url: string;
  appId?: string;             // bundle id (Play) or trackId (iOS)
  iconUrl?: string;
  developer?: string;
  genre?: string;
  category?: Category;        // best-effort mapping from genre at save time
  shortDesc?: string;
  fullDesc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  defaultPlatform: Platform;
  emailNotifications: boolean;
  plan: PlanId;
  planExpiresAt?: string;
  trialEndsAt?: string;
  couponCode?: string;
  dodoSubscriptionId?: string;
  dodoCustomerId?: string;
  billingInterval?: "monthly" | "annual";
}

export interface UserQuotas {
  generator: number;
  reddit: number;
  competitor: number;
  keywordRank: number;
  reviewIntel: number;
  buzzTracker: number;
  periodStart: string;
}

export const EMPTY_QUOTAS: UserQuotas = {
  generator: 0,
  reddit: 0,
  competitor: 0,
  keywordRank: 0,
  reviewIntel: 0,
  buzzTracker: 0,
  periodStart: new Date().toISOString(),
};

export interface CouponCode {
  id: string;
  plan: "pro" | "max";
  durationDays: number;
  maxRedemptions: number;
  redemptions: number;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  active: boolean;
  note?: string;
}

export interface CouponRedemption {
  couponId: string;
  userId: string;
  userEmail: string;
  plan: "pro" | "max";
  durationDays: number;
  redeemedAt: string;
}

export type { PlanId, QuotaTool };

export interface ScoreResult {
  score: number;
  grade: string;
  checks: ScoreCheck[];
}

export interface ScoreCheck {
  label: string;
  passed: boolean;
  note: string;
}

// Full /api/audit response — defined here so client code can hold it as a
// stored snapshot without importing from the API route file.
export interface AuditPayload {
  url: string;
  source: "play" | "ios" | null;
  scrape: {
    ok: boolean;
    title?: string;
    subtitle?: string;
    shortDesc?: string;
    fullDesc?: string;
    // Ranking-signal fields scraped from the store. Optional — present only
    // when the scraper found them, used by the scorer when available.
    rating?: number;
    ratingCount?: number;
    screenshotUrls?: string[];
    lastUpdated?: string;
    developer?: string;
    genre?: string;
  };
  // Strategic ASO recommendations that can't be scored from a public scrape
  // (review velocity, install rate, A/B tests, localization, etc.) but matter
  // more than most copy fixes. Shown to the user as a separate section so they
  // know what to track in Play Console / App Store Connect.
  advisories?: Array<{
    label: string;
    detail: string;
    category: "ranking" | "conversion" | "maintenance" | "expansion";
  }>;
  snapshot: {
    appId?: string;
    slug?: string;
    country?: string;
    locale?: string;
    detectedCategory?: string;
  };
  keywords: {
    primary?: { word: string; count: number };
    secondary: { word: string; count: number }[];
    totalUnique: number;
  };
  characterUsage: Array<{
    field: string;
    actual: number;
    limit: number;
    status: "ok" | "tight" | "over" | "missing";
  }>;
  score: { score: number; grade: string; checks: ScoreCheck[] };
}

// Persisted record of a Score Checker audit. Keyed by a hash of the URL so
// re-running the audit for the same listing replaces the prior record rather
// than duplicating history. `snapshot` carries the full audit payload at the
// time of save so the history view can show the exact data without re-running.
export interface AuditRecord {
  id: string;
  url: string;
  source: "play" | "ios" | null;
  appName?: string;
  score: number;
  grade: string;
  createdAt: string;
  snapshot?: AuditPayload;
}

// Competitor Watch — analysis of one app + N competitors.
export interface CompetitorAppData {
  url: string;
  source: "play" | "ios" | null;
  scrapeOk: boolean;
  title?: string;
  developer?: string;
  genre?: string;
  iconUrl?: string;
  rating?: number;
  ratingCount?: number;
  appId?: string;
  primaryKeyword?: { word: string; count: number };
  secondaryKeywords: { word: string; count: number }[];
  titleLength: number;
  shortDescLength: number;
  fullDescLength: number;
  shortDesc?: string;
  lastUpdated?: string;
  price?: string;
  downloads?: number;
}

export interface CompetitorInsight {
  label: string;
  detail: string;
  tone: "positive" | "warning" | "neutral";
}

export interface CompetitorAnalysisResult {
  target: CompetitorAppData;
  competitors: CompetitorAppData[];
  insights: CompetitorInsight[];
  discoveryMode: "manual" | "auto" | "mixed";
  keywordOverlap: { word: string; competitorsCount: number; targetHas: boolean }[];
  // Optional LLM-generated strategic summary. Populated when the client fires
  // /api/competitor-insight after the analysis. Saved into the persisted
  // record so opening from history shows the same insight without re-calling.
  reportInsight?: CompetitorReportInsight;
}

export interface CompetitorReportInsight {
  summary: string;
  positioningLevel: "ahead" | "comparable" | "behind";
  positioningRationale: string;
  observations: string[];
  topThreat?: string;
  whitespace?: string;
}

// Ranked app from a keyword search. Defined here (instead of in
// lib/keyword-rank.ts, which is server-only) so client + Firestore both
// share the shape.
export interface RankedApp {
  rank: number;
  source: "play" | "ios";
  url: string;
  appId?: string;
  title?: string;
  developer?: string;
  iconUrl?: string;
  rating?: number;
  ratingCount?: number;
  genre?: string;
  price?: string;
  downloads?: number;
}

export interface KeywordRankResult {
  keyword: string;
  country: string;
  lang: string;
  store: "play" | "ios" | "both";
  limit: number;
  apps: RankedApp[];
  cachedAt: string;
  fromCache: boolean;
  // Optional LLM-generated insight summary. Populated when the client kicks
  // off /api/keyword-insight after the rank check. Saved into the persisted
  // record so opening from history shows the same insight without a re-call.
  insight?: KeywordInsight;
}

export interface KeywordInsight {
  summary: string;
  competitionLevel: "low" | "moderate" | "high";
  competitionRationale: string;
  observations: string[];
  titlePattern?: string;
  opportunity?: string;
}

// Persisted summary of a Competitor Watch run. Keyed by hash of target URL so
// re-running the same analysis updates rather than duplicates. We store only
// the summary here; the full result is regenerated on view (competitor lists
// drift over time anyway, so a fresh fetch is usually what the user wants).
export interface CompetitorRecord {
  id: string;
  targetUrl: string;
  targetTitle?: string;
  targetSource: "play" | "ios" | null;
  country: string;         // 2-letter ISO; "auto" means "use whatever the URL encodes"
  competitorCount: number;
  successfulCount: number;
  discoveryMode: "manual" | "auto" | "mixed";
  createdAt: string;
  snapshot?: CompetitorAnalysisResult;
}

// Persisted summary of a keyword rank check. Keyed by hash of the
// (keyword|country|lang|store) tuple so the same query overwrites instead of
// duplicating in history. Like CompetitorRecord, we store just the summary —
// the live ranking changes anyway so opening a record re-runs the query.
export interface KeywordRankRecord {
  id: string;
  keyword: string;
  country: string;
  lang: string;
  store: "play" | "ios" | "both";
  limit: number;
  topResultsCount: number;
  topResultTitle?: string;
  createdAt: string;
  snapshot?: KeywordRankResult;
}

// Reddit demand-validation analysis. The user submits an idea; we search
// Reddit for posts where people are asking for / complaining about that kind
// of app, and surface a demand score + brief + tagged post list.
export interface RedditPostSummary {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdAt: string;
  permalink: string;
  author: string;
}

export interface RedditPlan {
  problem: string;
  audience: string;
  primaryKeywords: string[];
  subreddits: string[];
  demandQueries: string[];
}

export interface RedditSelectedPost {
  id: string;
  tag: "request" | "complaint" | "discussion";
  insight: string;
}

export interface RedditRank {
  brief: string;
  demandScore: number;
  demandLabel: "Low" | "Moderate" | "High" | "Very high";
  topThemes: string[];
  selectedPosts: RedditSelectedPost[];
}

export interface RedditAnalysisPayload {
  idea: string;
  plan: RedditPlan;
  posts: RedditPostSummary[];
  rank: RedditRank;
  createdAt: string;
}

// Persisted summary of one Reddit demand analysis. Keyed by hash of the idea
// text so re-running the same idea updates rather than duplicates.
export interface RedditAnalysisRecord {
  id: string;
  idea: string;
  ideaPreview: string;      // first ~80 chars for list display
  demandScore: number;
  demandLabel: "Low" | "Moderate" | "High" | "Very high";
  postCount: number;        // selected post count
  createdAt: string;
  snapshot?: RedditAnalysisPayload;
}

export interface KeywordResult {
  word: string;
  count: number;
}

// Per-generation usage record. Persisted to /users/{uid}/usage/{genId} after
// /api/generate returns, so the admin dashboard can aggregate cost + token
// consumption across all generations without needing a separate analytics
// pipeline. `calls` is the per-stage breakdown (draft / refine / expand,
// once per platform) so we can debug which stage is driving usage.
export interface UsageCall {
  stage: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Which API tool the usage came from. /api/generate is the biggest by far;
// clarify and reddit are smaller per-call but add up across users.
export type UsageTool = "generate" | "clarify" | "reddit" | "keyword-insight" | "competitor-insight" | "review-intelligence";

export interface UsageRecord {
  id: string;                 // per-call id (e.g. generation id, reddit analysis id)
  userId: string;
  userEmail?: string;
  tool: UsageTool;
  // Tool-specific context — appName/category/platforms for generate, idea
  // preview for reddit, etc. All optional so the same shape works across
  // tools.
  appName?: string;
  category?: string;
  platforms?: Platform[];
  context?: string;           // free-text summary for non-generate tools (e.g. reddit idea preview)
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  elapsedMs: number;
  calls: UsageCall[];
  createdAt: string;          // ISO timestamp
}

export interface Toast {
  id: string;
  message: string;
  type: "default" | "success";
}

// ─── Review Intelligence ─────────────────────────────────────────────────

export interface ScrapedReview {
  id: string;
  text: string;
  rating: number;
  date: string;
  version?: string;
  helpfulCount?: number;
  language?: string;
  reviewerName?: string;
  store: "play" | "ios";
}

export interface ReviewTheme {
  theme: string;
  mentionCount: number;
  sentimentStrength: number;
  trend: "rising" | "stable" | "declining";
  tone: "positive" | "negative";
  sampleQuotes: string[];
}

export interface FeatureRequest {
  request: string;
  frequency: number;
  growthTrend: "rising" | "stable" | "declining";
}

export interface AspectSentiment {
  aspect: string;
  positive: number;
  neutral: number;
  negative: number;
  trend: "improving" | "stable" | "declining";
}

export interface MarketOpportunity {
  opportunity: string;
  signal: string;
  confidence: "high" | "medium" | "low";
  category: "feature_gap" | "trust_issue" | "ux_pain" | "monetization" | "unmet_need";
}

export interface ReviewIntelligenceResult {
  appUrl: string;
  appTitle?: string;
  appIcon?: string;
  store: "play" | "ios";
  reviewCount: number;
  scrapedAt: string;

  ratingDistribution: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };

  globalSentiment: {
    positive: number;
    neutral: number;
    negative: number;
    avgRating: number;
  };

  positiveThemes: ReviewTheme[];
  negativeThemes: ReviewTheme[];
  featureRequests: FeatureRequest[];
  aspectSentiments: AspectSentiment[];
  marketOpportunities: MarketOpportunity[];

  competitorSummary: {
    strengths: string[];
    weaknesses: string[];
    risingIssues: string[];
    strategicOpportunities: string[];
  };
}

export interface ReviewIntelligenceRecord {
  id: string;
  appUrl: string;
  appTitle?: string;
  store: "play" | "ios";
  reviewCount: number;
  avgRating: number;
  positiveThemeCount: number;
  negativeThemeCount: number;
  opportunityCount: number;
  createdAt: string;
  snapshot?: ReviewIntelligenceResult;
}

// ─── Buzz Tracker (Brand Mention Monitor) ───────────────────────────────

export interface BuzzTracker {
  id: string;
  keywords: string[];
  subreddits?: string[];
  enabled: boolean;
  lastCheckedAt?: string;
  totalMentions: number;
  unseenCount: number;
  createdAt: string;
}

export interface BuzzMention {
  id: string;
  trackerId: string;
  postId: string;
  title: string;
  body: string;
  author: string;
  subreddit: string;
  permalink: string;
  score: number;
  numComments: number;
  matchedKeyword: string;
  postCreatedAt: string;
  foundAt: string;
  seen: boolean;
}

export interface BuzzCheckResult {
  trackerId: string;
  newMentionCount: number;
  totalChecked: number;
  checkedAt: string;
  errors?: string[];
}
