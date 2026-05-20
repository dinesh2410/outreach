import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { RankedApp, UsageCall } from "@/lib/types";
import { readUsage, summarizeUsage, logUsageSummary } from "@/lib/usage-tracking";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/keyword-insight { keyword, country, store, apps }
// Returns a structured ASO insight summarising the SERP for the keyword.
// Fired client-side in parallel with /api/keyword-rank so the rank list
// surfaces immediately; the insight populates a few seconds later.

const KeywordInsightSchema = z.object({
  summary: z
    .string()
    .min(40)
    .max(180)
    .describe(
      "One-line, punchy overview of what's currently ranking. 60-140 chars."
    ),
  competitionLevel: z
    .enum(["low", "moderate", "high"])
    .describe(
      "Qualitative competition difficulty for ranking on this keyword. 'high' when the SERP is dominated by major publishers with large rating counts. 'low' when the rankings are mostly small developers with modest review counts. 'moderate' otherwise."
    ),
  competitionRationale: z
    .string()
    .min(40)
    .max(220)
    .describe("One sentence justifying the competition level call."),
  observations: z
    .array(z.string().min(40).max(220))
    .min(3)
    .max(6)
    .describe(
      "3-6 short observations of patterns in the SERP — title structure, dominant audience, monetization split, common categories, freshness signals. Each 80-180 chars."
    ),
  titlePattern: z
    .string()
    .max(160)
    .optional()
    .describe(
      "If a clear title pattern is visible across multiple ranked apps (e.g. 'Brand: Habit Tracker' or 'Habit Tracker — Brand'), describe it. Omit if no pattern."
    ),
  opportunity: z
    .string()
    .max(240)
    .optional()
    .describe(
      "One sentence pointing at a specific gap an indie developer could exploit — different audience, missing feature angle, weaker monetization model in the top results. Concrete only. Omit if no clear gap."
    ),
});

interface InsightRequest {
  keyword?: string;
  country?: string;
  store?: "play" | "ios" | "both";
  apps?: RankedApp[];
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: InsightRequest;
  try {
    body = (await req.json()) as InsightRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const keyword = body.keyword?.trim();
  if (!keyword) {
    return Response.json({ error: "Missing keyword" }, { status: 400 });
  }
  if (!Array.isArray(body.apps) || body.apps.length === 0) {
    return Response.json({ error: "apps array is required" }, { status: 400 });
  }

  const usageLog: UsageCall[] = [];
  const requestStart = Date.now();

  const lines = body.apps.slice(0, 30).map((a) => {
    const meta: string[] = [];
    if (a.developer) meta.push(a.developer);
    if (a.genre) meta.push(a.genre);
    if (a.rating !== undefined && a.ratingCount !== undefined) {
      meta.push(`${a.rating.toFixed(1)} (${formatCompact(a.ratingCount)})`);
    } else if (a.rating !== undefined) {
      meta.push(a.rating.toFixed(1));
    }
    if (a.price) meta.push(a.price);
    const platform = a.source === "play" ? "Play" : "App Store";
    return `${a.rank}. [${platform}] "${a.title ?? "Untitled"}" — ${meta.join(" · ") || "no metadata"}`;
  });

  const prompt = `You are an ASO expert analysing a keyword search-result page (SERP).

Keyword: "${keyword}"
Country: ${body.country?.toUpperCase() ?? "—"}
Store: ${storeLabel(body.store)}

Top-ranked apps (in the order each store presented them):
${lines.join("\n")}

Your job: produce a structured insight to help an indie developer decide whether to target this keyword and how to position against the current ranking.

Rules:
- Be honest about competition difficulty. High ratings + large rating counts on multiple slots = entrenched competition (= high).
- Look for patterns: title structure (do most apps front-load the keyword? use "Brand: Descriptor"?), dominant audience, monetisation (free vs paid mix), common publisher size.
- DO NOT repeat the rank list back. The developer can already see it.
- 'opportunity' must be concrete — name a specific gap (audience, feature, positioning, price tier). If you can't identify one, OMIT it rather than making something up.
- 'titlePattern' must be a real recurring shape. OMIT if titles are all over the place.
- Match a writing style that sounds like an experienced ASO person briefing a friend: direct, no marketing language, no hype.

Return ONLY the structured object.`;

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: KeywordInsightSchema,
      prompt,
    });
    usageLog.push(readUsage("insight", res));
    const summary = summarizeUsage(usageLog, Date.now() - requestStart);
    logUsageSummary(`/api/keyword-insight "${keyword}"`, summary);
    return Response.json({ ...res.object, usage: summary });
  } catch (err) {
    console.error("[/api/keyword-insight] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate insight" },
      { status: 500 }
    );
  }
}

function storeLabel(s: "play" | "ios" | "both" | undefined): string {
  if (s === "play") return "Google Play";
  if (s === "ios") return "Apple App Store";
  return "Google Play + Apple App Store (interleaved)";
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
