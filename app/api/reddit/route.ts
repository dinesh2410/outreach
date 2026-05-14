import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { searchRedditMany, type RedditPost } from "@/lib/reddit";
import { RedditPlanSchema, RedditRankSchema, type RedditPlan, type RedditRank } from "./schema";
import { buildPlanPrompt, buildRankPrompt } from "./prompts";

// POST /api/reddit { idea: string }
//
// Two-stage flow:
//   1. Gemini extracts a search plan (keywords + subreddits + demand queries).
//   2. We fan out searches against Reddit's public JSON API, dedupe by post id.
//   3. Gemini re-ranks the deduped posts, tags each (request / complaint /
//      discussion), writes a brief, and scores demand 0–100.
//
// Returns the full RedditAnalysisPayload — see lib/types.ts.

export const runtime = "nodejs";
export const maxDuration = 60;

// Cap posts we feed to the ranker. 40 is enough signal without burning tokens.
const RANKABLE_CAP = 40;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: { idea?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idea = body.idea?.trim();
  if (!idea) {
    return Response.json({ error: "Missing idea" }, { status: 400 });
  }
  if (idea.length < 20) {
    return Response.json(
      { error: "Tell us a bit more about the idea — at least 20 characters." },
      { status: 400 }
    );
  }
  if (idea.length > 2000) {
    return Response.json(
      { error: "Idea is too long (max 2000 chars)." },
      { status: 400 }
    );
  }

  // --- Step 1: plan the search --------------------------------------------
  let plan: RedditPlan;
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: RedditPlanSchema,
      prompt: buildPlanPrompt(idea),
    });
    plan = object;
  } catch (err) {
    console.error("[/api/reddit] plan stage failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to plan search" },
      { status: 500 }
    );
  }

  // --- Step 2: fan-out search ---------------------------------------------
  // Build a batch of queries: each demandQuery against all of Reddit, plus
  // each primaryKeyword scoped to each of the top subreddits. We cap total
  // queries at 12 so we don't trip Reddit's rate limiter on a single run.
  const queries: { query: string; subreddit?: string }[] = [];
  for (const q of plan.demandQueries.slice(0, 5)) {
    queries.push({ query: q });
  }
  const topSubs = plan.subreddits.slice(0, 3);
  const topKw = plan.primaryKeywords.slice(0, 2);
  for (const sub of topSubs) {
    for (const kw of topKw) {
      if (queries.length >= 12) break;
      queries.push({ query: kw, subreddit: sub });
    }
    if (queries.length >= 12) break;
  }

  let allPosts: RedditPost[] = [];
  try {
    allPosts = await searchRedditMany(queries.map((q) => ({ ...q, limit: 15 })));
  } catch (err) {
    console.error("[/api/reddit] fan-out failed:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to search Reddit",
      },
      { status: 502 }
    );
  }

  if (allPosts.length === 0) {
    return Response.json({
      idea,
      plan,
      posts: [],
      rank: {
        brief:
          "No Reddit posts surfaced for this idea on the queries we tried. That can mean the niche is too narrow, the audience doesn't post about it on Reddit, or our search phrasing missed it. Try rephrasing the idea with more concrete pain wording.",
        demandScore: 0,
        demandLabel: "Low" as const,
        topThemes: [],
        selectedPosts: [],
      },
      createdAt: new Date().toISOString(),
    });
  }

  // Rank by engagement (score + comments) before truncation so the LLM sees
  // the most-engaged posts first.
  allPosts.sort(
    (a, b) => b.score + b.numComments * 2 - (a.score + a.numComments * 2)
  );
  const rankable = allPosts.slice(0, RANKABLE_CAP);

  // --- Step 3: rank + tag + brief -----------------------------------------
  let rank: RedditRank;
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: RedditRankSchema,
      prompt: buildRankPrompt(idea, rankable),
    });
    rank = object;
  } catch (err) {
    console.error("[/api/reddit] rank stage failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to rank posts" },
      { status: 500 }
    );
  }

  // Filter the selectedPosts list to ids that actually exist in our rankable
  // set (LLM can hallucinate ids), and keep the order the LLM returned.
  const byId = new Map(rankable.map((p) => [p.id, p]));
  const validSelected = rank.selectedPosts.filter((s) => byId.has(s.id));

  return Response.json({
    idea,
    plan,
    posts: rankable,
    rank: { ...rank, selectedPosts: validSelected },
    createdAt: new Date().toISOString(),
  });
}
