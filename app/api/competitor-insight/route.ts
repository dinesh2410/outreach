import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { CompetitorAppData, UsageCall } from "@/lib/types";
import { readUsage, summarizeUsage, logUsageSummary } from "@/lib/usage-tracking";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/competitor-insight { target, competitors }
// Returns a structured strategic insight summarising the competitive landscape.
// Fired client-side in parallel with /api/competitor so the comparison view
// surfaces immediately; the insight populates a few seconds later.

const CompetitorReportInsightSchema = z.object({
  summary: z
    .string()
    .min(40)
    .max(200)
    .describe("One-line, punchy overview of the competitive landscape. 60-160 chars."),
  positioningLevel: z
    .enum(["ahead", "comparable", "behind"])
    .describe(
      "Where the target app stands relative to its competitor cohort. 'ahead' = target has materially higher rating volume / quality than most; 'behind' = target trails most competitors; 'comparable' = roughly in the same tier."
    ),
  positioningRationale: z
    .string()
    .min(40)
    .max(240)
    .describe("One sentence justifying the positioning level call."),
  observations: z
    .array(z.string().min(40).max(220))
    .min(3)
    .max(6)
    .describe(
      "3-6 short observations of patterns across the competitor cohort — title structures, audience overlap, monetisation split, rating freshness, dominant publisher signals. Each 80-180 chars."
    ),
  topThreat: z
    .string()
    .max(180)
    .optional()
    .describe(
      "If one competitor clearly dominates (much higher ratings, stronger ASO, or sharpest positioning), name it and say why in one sentence. Omit if no single competitor is the standout."
    ),
  whitespace: z
    .string()
    .max(240)
    .optional()
    .describe(
      "One sentence naming a specific positioning gap the target could exploit — an audience, feature angle, monetisation tier, or category nuance that none of the competitors own. Concrete only. Omit if no clear gap."
    ),
});

interface InsightRequest {
  target?: CompetitorAppData;
  competitors?: CompetitorAppData[];
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

  if (!body.target) {
    return Response.json({ error: "Missing target" }, { status: 400 });
  }
  if (!Array.isArray(body.competitors) || body.competitors.length === 0) {
    return Response.json({ error: "competitors array is required" }, { status: 400 });
  }

  const usageLog: UsageCall[] = [];
  const requestStart = Date.now();

  const targetLine = formatAppLine(body.target, "TARGET");
  const competitorLines = body.competitors
    .filter((c) => c.scrapeOk)
    .slice(0, 12)
    .map((c, i) => formatAppLine(c, `Competitor ${i + 1}`));

  const prompt = `You are an ASO expert analysing a competitor research result for an indie developer.

═══ TARGET APP ═══
${targetLine}

═══ COMPETITORS ═══
${competitorLines.join("\n")}

Your job: produce a structured strategic insight to help the developer understand where their app stands and how to position differently.

Rules:
- Be honest about the target's positioning. High competitor rating counts + better star ratings = the target is behind.
- Look for patterns: do most competitors target the same audience? Use the same title structure? Sit in the same category? Use Free or Paid monetisation?
- 'topThreat' should name a SPECIFIC competitor (use their title), not "the leading competitor". Omit if no single competitor clearly stands out.
- 'whitespace' must be concrete — name a specific audience, feature angle, or positioning the target could own. If no obvious gap, OMIT it rather than inventing one.
- 'observations' should NOT just summarise the table. Each one should give the developer something they couldn't see at a glance.
- Brief and direct. No marketing language. Sounds like an experienced ASO person briefing a colleague.

Return ONLY the structured object.`;

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CompetitorReportInsightSchema,
      prompt,
    });
    usageLog.push(readUsage("insight", res));
    const summary = summarizeUsage(usageLog, Date.now() - requestStart);
    logUsageSummary(`/api/competitor-insight "${body.target.title ?? body.target.url}"`, summary);
    return Response.json({ ...res.object, usage: summary });
  } catch (err) {
    console.error("[/api/competitor-insight] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate insight" },
      { status: 500 }
    );
  }
}

function formatAppLine(app: CompetitorAppData, label: string): string {
  const meta: string[] = [];
  if (app.developer) meta.push(app.developer);
  if (app.genre) meta.push(app.genre);
  if (app.rating !== undefined && app.ratingCount !== undefined) {
    meta.push(`${app.rating.toFixed(1)}★ (${formatCompact(app.ratingCount)})`);
  } else if (app.rating !== undefined) {
    meta.push(`${app.rating.toFixed(1)}★`);
  }
  if (app.price) meta.push(app.price);
  const lengthBits: string[] = [];
  if (app.titleLength > 0) lengthBits.push(`title ${app.titleLength}`);
  if (app.shortDescLength > 0) lengthBits.push(`short ${app.shortDescLength}`);
  if (app.fullDescLength > 0) lengthBits.push(`full ${app.fullDescLength}`);
  if (lengthBits.length > 0) meta.push(lengthBits.join("/"));
  const platform = app.source === "play" ? "Play" : app.source === "ios" ? "App Store" : "?";
  return `[${label}] [${platform}] "${app.title ?? "Untitled"}" — ${meta.join(" · ") || "no metadata"}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
