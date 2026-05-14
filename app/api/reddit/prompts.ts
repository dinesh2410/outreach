// Prompts for the two Gemini calls in /api/reddit. Kept here so the route
// file stays a thin orchestrator.

export function buildPlanPrompt(idea: string): string {
  return `You are a demand-research planner for indie app makers. The user
describes an app idea they're considering. Your job: extract a Reddit-ready
search plan that will surface posts where REAL PEOPLE are asking for,
complaining about, or discussing this kind of app.

THE IDEA
---
${idea.trim()}
---

Rules:
- problem: one sentence, user-facing. Not "an AI-powered solution for X" —
  "people forget to drink water and want a gentle reminder", that kind of
  plain framing.
- subreddits: real ones the audience actually uses. NEVER invent. If the
  niche is broad, prefer specific subs (r/productivity over r/apps).
- primaryKeywords: short, conversational, what someone TYPES not what a
  marketer would write.
- demandQueries: each should be a query that, run against Reddit search,
  is likely to return demand signals. Mix:
    (a) literal "is there an app" / "any app that" / "wish there was" phrases
    (b) "alternative to <known competitor>" if relevant
    (c) the pain point itself ("can't stay consistent with habits")
  Use double-quotes around multi-word phrases you want matched literally.
- Do NOT include the app's hypothetical name or your own marketing language.
- Do NOT add commentary outside the schema fields.`;
}

interface RankablePost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdAt: string;
}

export function buildRankPrompt(idea: string, posts: RankablePost[]): string {
  const lines = posts.map((p, i) => {
    const body = p.body.replace(/\s+/g, " ").slice(0, 320);
    const ageDays = Math.floor(
      (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `[${i + 1}] id=${p.id} r/${p.subreddit} · ▲${p.score} · 💬${p.numComments} · ${ageDays}d ago
   Title: ${p.title}
   Body:  ${body || "(no body)"}`;
  });
  return `You are a demand-research analyst. The user is considering building
an app described below. We searched Reddit and got the following posts.

YOUR JOB
1. Drop posts that are off-topic, spam, or only tangentially related.
2. Tag each kept post as request / complaint / discussion.
3. Write a 3–5 sentence brief on what people are actually saying.
4. Score 0–100 how strong the demand signal looks.
5. Pull out 2–5 recurring themes.

HONEST SCORING GUIDE (calibrate to this):
   0–20  almost nobody asking — niche too narrow or too niche-different
  21–40  scattered interest, low engagement
  41–60  clear interest, multiple posts but not viral
  61–80  strong recurring demand, real complaints, willing-to-pay signals
  81–100 well-documented unmet need, lots of upvotes/comments asking exactly this

THE IDEA
---
${idea.trim()}
---

POSTS (numbered; refer to them by id, not number)
${lines.join("\n\n")}

Return only the structured output the schema asks for. Skip posts that don't
add signal — fewer high-quality picks beats a long list of weak ones.`;
}
