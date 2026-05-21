import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { ScrapedReview, UsageCall } from "@/lib/types";
import { readUsage, summarizeUsage, logUsageSummary } from "@/lib/usage-tracking";

export const runtime = "nodejs";
export const maxDuration = 90;

const ReviewThemeSchema = z.object({
  theme: z.string().describe("Short theme label, e.g. 'Ad complaints' or 'Fast performance'"),
  mentionCount: z.number().int().min(1).describe("Estimated number of reviews mentioning this theme"),
  sentimentStrength: z.number().min(0).max(1).describe("0-1 intensity of sentiment for this theme"),
  trend: z.enum(["rising", "stable", "declining"]).describe("Whether this theme is growing, stable, or shrinking based on review dates"),
  tone: z.enum(["positive", "negative"]).describe("Whether this theme is praise or complaint"),
  sampleQuotes: z.array(z.string()).min(1).max(3).describe("1-3 representative review excerpts (verbatim or near-verbatim)"),
});

const FeatureRequestSchema = z.object({
  request: z.string().describe("What users are asking for, e.g. 'Dark mode' or 'Offline support'"),
  frequency: z.number().int().min(1).describe("How many reviews mention this request"),
  growthTrend: z.enum(["rising", "stable", "declining"]).describe("Whether demand for this feature is growing"),
});

const AspectSentimentSchema = z.object({
  aspect: z.string().describe("Product area, e.g. 'UX', 'Performance', 'Pricing', 'Support', 'Community'"),
  positive: z.number().min(0).max(100).describe("Percentage of reviews mentioning this aspect that are positive"),
  neutral: z.number().min(0).max(100).describe("Percentage neutral"),
  negative: z.number().min(0).max(100).describe("Percentage negative"),
  trend: z.enum(["improving", "stable", "declining"]).describe("Sentiment direction over time"),
});

const MarketOpportunitySchema = z.object({
  opportunity: z.string().describe("Actionable opportunity statement"),
  signal: z.string().describe("What user feedback signals this opportunity"),
  confidence: z.enum(["high", "medium", "low"]).describe("How strong the evidence is"),
  category: z.enum(["feature_gap", "trust_issue", "ux_pain", "monetization", "unmet_need"]).describe("Type of opportunity"),
});

const ReviewIntelligenceSchema = z.object({
  globalSentiment: z.object({
    positive: z.number().min(0).max(100).describe("Percentage of reviews that are positive (4-5 stars)"),
    neutral: z.number().min(0).max(100).describe("Percentage neutral (3 stars)"),
    negative: z.number().min(0).max(100).describe("Percentage negative (1-2 stars)"),
    avgRating: z.number().min(1).max(5).describe("Average star rating across all reviews"),
  }),

  positiveThemes: z
    .array(ReviewThemeSchema)
    .describe("Major positive themes users repeatedly praise. Group semantically similar feedback. Sort by mention count descending. Return 3-8 themes."),

  negativeThemes: z
    .array(ReviewThemeSchema)
    .describe("Major complaints, bugs, frustrations. Group semantically similar complaints (e.g. 'too many ads', 'ads everywhere', 'aggressive ads' → 'Ad complaints'). Sort by severity/mention count. Return 3-8 themes."),

  featureRequests: z
    .array(FeatureRequestSchema)
    .describe("Features users are explicitly requesting. Extract from phrases like 'I wish', 'please add', 'would be great if', 'needs'. Sort by frequency. Return 0-8 items."),

  aspectSentiments: z
    .array(AspectSentimentSchema)
    .describe("Sentiment breakdown by product area. Include UX, Performance, and at least one of: Pricing, Support, Community, Content, Reliability. Return 3-7 items."),

  marketOpportunities: z
    .array(MarketOpportunitySchema)
    .describe("Strategic opportunities derived from complaints + feature requests + unmet needs. Must be ACTIONABLE and SPECIFIC, not generic. Each opportunity should cite the user feedback that supports it. Return 2-6 items."),

  competitorSummary: z.object({
    strengths: z
      .array(z.string())
      .describe("What users genuinely love about this app. Concrete, not generic. Return 2-5 items."),
    weaknesses: z
      .array(z.string())
      .describe("Major user frustrations and product weaknesses. Return 2-5 items."),
    risingIssues: z
      .array(z.string())
      .describe("Issues that appear to be getting worse based on recent reviews. Return 0-4 items."),
    strategicOpportunities: z
      .array(z.string())
      .describe("If you were building a competitor, what would you do differently? Be specific. Return 2-4 items."),
  }),
});

interface IntelligenceRequest {
  reviews?: ScrapedReview[];
  appTitle?: string;
  appUrl?: string;
  store?: "play" | "ios";
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: IntelligenceRequest;
  try {
    body = (await req.json()) as IntelligenceRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.reviews) || body.reviews.length === 0) {
    return Response.json({ error: "reviews array is required" }, { status: 400 });
  }

  // Compute real stats from ALL scraped reviews before any filtering
  const allReviewStats = computeRealStats(body.reviews);
  const allRatingDist = computeRatingDistribution(body.reviews);

  // Curate: dedupe, filter low-quality, pick top 50 per star tier
  const curated = cleanReviews(body.reviews);

  if (curated.length < 5) {
    return Response.json(
      { error: "Not enough detailed reviews for analysis (minimum 5)" },
      { status: 400 }
    );
  }

  const usageLog: UsageCall[] = [];
  const requestStart = Date.now();

  const reviewBlock = curated
    .map((r, i) => formatReviewLine(r, i + 1))
    .join("\n");

  const prompt = `You are a senior competitive intelligence analyst specializing in mobile apps. You are analyzing user reviews for "${body.appTitle ?? "a competitor app"}" (${body.store === "ios" ? "App Store" : "Google Play"}).

Your job is to convert raw user reviews into structured, actionable business intelligence.

═══ REVIEW DATASET ═══
Total reviews scraped: ${body.reviews.length}
Rating distribution (all reviews): ${allRatingDist}
Curated detailed reviews below: ${curated.length} (top 50 per star tier, filtered for quality)

${reviewBlock}

═══ ANALYSIS INSTRUCTIONS ═══

1. SEMANTIC CLUSTERING: Group semantically similar reviews. "too many ads", "ads everywhere", "aggressive ads" → ONE theme: "Ad complaints". "fake users", "bots", "not real people" → "Fake user complaints". Do NOT create separate themes for the same underlying issue.

2. POSITIVE THEMES: What do users genuinely love? Look for repeated praise patterns. Count how many reviews support each theme.

3. NEGATIVE THEMES: What are users frustrated about? Group by root cause. Identify severity (how angry are users?). Track whether the issue seems to be getting worse over time based on dates.

4. FEATURE REQUESTS: Extract concrete things users are asking for. "I wish it had dark mode" → Feature request: Dark mode. Distinguish from complaints (complaints describe what's broken; requests describe what's missing).

5. ASPECT-BASED SENTIMENT: Break sentiment into product areas (UX, Performance, Pricing, Support, etc.). For each area, what percentage of mentions are positive vs negative?

6. MARKET OPPORTUNITIES: This is the most important section. Combine complaints + requests + unmet needs to identify strategic opportunities. Every opportunity must:
   - Be SPECIFIC and ACTIONABLE (not "improve the app")
   - Cite the user feedback that supports it
   - Indicate confidence level based on how much evidence exists

7. COMPETITOR SUMMARY: Write as if briefing a founder who wants to build a better alternative.
   - Strengths: what makes this app defensible?
   - Weaknesses: where is the product vulnerable?
   - Rising issues: what's getting worse?
   - Strategic opportunities: what would a smart competitor do?

Rules:
- Be brutally honest. Don't soften negatives.
- Use the actual words users use — don't sanitize.
- Mention counts must be realistic relative to the dataset size.
- Trends should be inferred from review dates when possible.
- Sound like an experienced product strategist, not a summary bot.
- This is competitive intelligence, not a review summary.

Return ONLY the structured object.`;

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ReviewIntelligenceSchema,
      prompt,
    });
    usageLog.push(readUsage("intelligence", res));
    const summary = summarizeUsage(usageLog, Date.now() - requestStart);
    logUsageSummary(
      `/api/review-intelligence "${body.appTitle ?? body.appUrl ?? "?"}"`,
      summary
    );
    return Response.json({
      ...res.object,
      globalSentiment: allReviewStats.sentiment,
      ratingDistribution: allReviewStats.distribution,
      totalScraped: body.reviews.length,
      curatedCount: curated.length,
      usage: summary,
    });
  } catch (err) {
    console.error("[/api/review-intelligence] failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to generate intelligence";
    const userMessage = msg.includes("No object generated")
      ? "AI couldn't analyze these reviews — try again or use a different app."
      : msg;
    return Response.json({ error: userMessage }, { status: 500 });
  }
}

const LOW_QUALITY_RE =
  /^(nice|good|bad|ok|okay|great|awesome|love it|hate it|best|worst|excellent|amazing|terrible|horrible|perfect|cool|fine|meh|trash|crap|rubbish|superb|decent|average|useful|useless|wow|yay|nah|no|yes|thanks|thank you|thankyou|love|liked|dislike|super|fantastic|wonderful|sucks|pathetic|brilliant|outstanding|poor|worst app|best app|good app|bad app|nice app|very good|very bad|very nice|not good|not bad)[\s!.\-,]*$/i;

const JUNK_PATTERNS = [
  /^.{0,2}$/,
  /^[^\w]*$/,
  /^(\w+\s?){1,3}[.!?]*$/,
];

function cleanReviews(reviews: ScrapedReview[]): ScrapedReview[] {
  const seen = new Set<string>();
  const deduped: ScrapedReview[] = [];

  for (const r of reviews) {
    if (!r.text || r.text.trim().length < 15) continue;
    const normalized = r.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (LOW_QUALITY_RE.test(normalized)) continue;
    if (JUNK_PATTERNS.some((p) => p.test(normalized))) continue;
    // Word count check — need at least 4 words
    if (normalized.split(/\s+/).length < 4) continue;
    const key = normalized.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Group by star rating
  const tiers: Map<number, ScrapedReview[]> = new Map();
  for (let s = 1; s <= 5; s++) tiers.set(s, []);
  for (const r of deduped) {
    tiers.get(r.rating)?.push(r);
  }

  const PER_TIER = 50;
  const selected: ScrapedReview[] = [];

  const now = Date.now();
  for (let s = 1; s <= 5; s++) {
    const tier = tiers.get(s) ?? [];
    // Sort by recency first, then quality — avoids surfacing stale complaints
    // about issues that may already be fixed.
    tier.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      const ageA = dateA ? (now - dateA) / 86_400_000 : 9999;
      const ageB = dateB ? (now - dateB) / 86_400_000 : 9999;
      // Recency bonus: reviews <90 days get a big boost, <180 days a moderate boost
      const recencyA = ageA < 90 ? 2000 : ageA < 180 ? 1000 : 0;
      const recencyB = ageB < 90 ? 2000 : ageB < 180 ? 1000 : 0;
      const qualityA = Math.min(a.text.length, 500) + (a.helpfulCount ?? 0) * 50;
      const qualityB = Math.min(b.text.length, 500) + (b.helpfulCount ?? 0) * 50;
      return (recencyB + qualityB) - (recencyA + qualityA);
    });
    selected.push(...tier.slice(0, PER_TIER));
  }

  return selected;
}

function formatReviewLine(r: ScrapedReview, n: number): string {
  const meta: string[] = [`${r.rating}★`];
  if (r.date) meta.push(r.date);
  if (r.version) meta.push(`v${r.version}`);
  if (r.helpfulCount && r.helpfulCount > 0) meta.push(`${r.helpfulCount} helpful`);
  const text = r.text.length > 400 ? r.text.slice(0, 400) + "…" : r.text;
  return `[${n}] [${meta.join(" · ")}] ${text}`;
}

function computeRatingDistribution(reviews: ScrapedReview[]): string {
  const counts = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
  }
  return `1★:${counts[0]} 2★:${counts[1]} 3★:${counts[2]} 4★:${counts[3]} 5★:${counts[4]}`;
}

function computeRealStats(reviews: ScrapedReview[]) {
  const counts = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      counts[r.rating - 1]++;
      sum += r.rating;
    }
  }
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const positive = counts[3] + counts[4]; // 4-5 stars
  const neutral = counts[2]; // 3 stars
  const negative = counts[0] + counts[1]; // 1-2 stars

  return {
    distribution: {
      star1: counts[0],
      star2: counts[1],
      star3: counts[2],
      star4: counts[3],
      star5: counts[4],
    },
    sentiment: {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100),
      avgRating: Number((sum / total).toFixed(2)),
    },
  };
}
