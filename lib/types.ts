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
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  why: string;
}

export interface ClarifyingAnswer {
  id: string;
  question: string;
  answer: string;
}

export interface Variant {
  id: string;
  label: string;
  approach: "keyword" | "conversion" | "brand";
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
}

export interface AppEntry {
  id: string;
  name: string;
  category: Category;
  icon: string;
  generations: GenerationResult[];
  createdAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  defaultPlatform: Platform;
  emailNotifications: boolean;
}

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
  score: { score: number; grade: string };
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

export interface Toast {
  id: string;
  message: string;
  type: "default" | "success";
}
