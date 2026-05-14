import { z } from "zod";

// Step 1 — extract a search plan from the user's idea.
// We push the LLM to think like a researcher: WHO is this for, WHAT problem,
// then translate that into Reddit-shaped queries.
export const RedditPlanSchema = z.object({
  problem: z
    .string()
    .describe("One short sentence describing the user-facing problem this app would solve. Plain language, no marketing."),
  audience: z
    .string()
    .describe("Who would use this app (e.g., 'self-taught developers', 'parents of toddlers')."),
  primaryKeywords: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("2–6 short keywords / phrases people would actually type when discussing this problem on Reddit. Lowercase, no quotes."),
  subreddits: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("2–8 likely subreddits where this audience hangs out. No 'r/' prefix. Real subreddits only."),
  demandQueries: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe(
      "3–6 search-ready query strings designed to surface DEMAND signals — posts where people ask for, complain about, or wish for this kind of app. Include reddit operators where helpful (quoted phrases, OR). Example: '\"is there an app\" habit tracker', '\"wish there was\" budgeting app'."
    ),
});
export type RedditPlan = z.infer<typeof RedditPlanSchema>;

// Step 2 — re-rank the surfaced posts. We pass the LLM a numbered list of
// posts and ask it to (a) drop the irrelevant ones, (b) tag each survivor,
// (c) write the brief, (d) score overall demand.
export const RedditRankSchema = z.object({
  brief: z
    .string()
    .describe(
      "One paragraph (3–5 sentences) summarizing WHAT people are actually asking for on Reddit related to this idea — the recurring pain, the missing feature, the workaround they're using today. Specific, not generic. No marketing fluff."
    ),
  demandScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "0–100 demand score. 0 = no real signal. 100 = many recent high-engagement posts asking for exactly this. Calibrate honestly — most ideas land 30–70."
    ),
  demandLabel: z
    .enum(["Low", "Moderate", "High", "Very high"])
    .describe("Plain-English label matching the score."),
  topThemes: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2–5 recurring themes across the posts (e.g., 'wants offline mode', 'frustrated by Notion bloat'). Each a short phrase."),
  selectedPosts: z
    .array(
      z.object({
        id: z.string().describe("The id from the input list. Must match exactly."),
        tag: z.enum(["request", "complaint", "discussion"]).describe(
          "request = directly asking 'is there an app that…'. complaint = unhappy with existing tools. discussion = relevant talk but not direct demand."
        ),
        insight: z
          .string()
          .describe("One short sentence (≤140 chars) on why this post matters for the idea."),
      })
    )
    .min(0)
    .max(20)
    .describe(
      "Up to 20 most relevant posts. SKIP posts that are off-topic or generic. Order by relevance, most useful first."
    ),
});
export type RedditRank = z.infer<typeof RedditRankSchema>;
