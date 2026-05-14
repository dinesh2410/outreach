// Reddit search helpers — anonymous public JSON API.
//
// Reddit's www.reddit.com/search.json endpoint serves JSON to anyone with a
// real User-Agent; no OAuth required. Rate-limited at ~60 req/min/IP. For our
// purposes (5–8 fan-out queries per analysis) that's plenty.
//
// We do NOT trust any field shape — Reddit silently changes payloads and the
// JSON often contains nulls in places the docs claim are strings. Every field
// is read defensively.

export interface RedditPost {
  id: string;
  title: string;
  body: string;        // selftext, may be empty
  subreddit: string;
  score: number;       // net upvotes
  numComments: number;
  createdAt: string;   // ISO from created_utc
  permalink: string;   // full https://reddit.com/... link
  author: string;
  nsfw: boolean;
}

const USER_AGENT =
  "outreach.app:demand-validator:v0.1 (+https://outreach-psi-sooty.vercel.app)";

// --- low-level fetch ------------------------------------------------------

async function redditFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    // Reddit's CDN occasionally serves stale 200s with HTML; we'll catch
    // those in the parser. Cache disabled because demand changes hourly.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Reddit ${res.status} for ${url}`);
  }
  const text = await res.text();
  // Reddit sometimes returns an HTML "rate limited" page with a 200. Guard
  // against that so we don't blow up the JSON parser.
  if (text.startsWith("<")) {
    throw new Error("Reddit returned HTML (likely rate-limited)");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Reddit returned non-JSON");
  }
}

// Parse Reddit's listing-of-children envelope into our flat RedditPost shape.
function parseListing(payload: unknown): RedditPost[] {
  const root = payload as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
  const kids = root?.data?.children;
  if (!Array.isArray(kids)) return [];
  const posts: RedditPost[] = [];
  for (const kid of kids) {
    const d = kid?.data;
    if (!d) continue;
    const id = typeof d.id === "string" ? d.id : null;
    const title = typeof d.title === "string" ? d.title : "";
    if (!id || !title) continue;
    const created = typeof d.created_utc === "number" ? d.created_utc : 0;
    const permalink =
      typeof d.permalink === "string" ? `https://www.reddit.com${d.permalink}` : "";
    posts.push({
      id,
      title,
      body: typeof d.selftext === "string" ? d.selftext : "",
      subreddit: typeof d.subreddit === "string" ? d.subreddit : "",
      score: typeof d.score === "number" ? d.score : 0,
      numComments: typeof d.num_comments === "number" ? d.num_comments : 0,
      createdAt: created > 0 ? new Date(created * 1000).toISOString() : new Date().toISOString(),
      permalink,
      author: typeof d.author === "string" ? d.author : "[deleted]",
      nsfw: d.over_18 === true,
    });
  }
  return posts;
}

// --- public API -----------------------------------------------------------

export interface RedditSearchOptions {
  /** Full-text query. Quoted phrases are passed through. */
  query: string;
  /** Optional subreddit (without leading r/). */
  subreddit?: string;
  /** How many results to fetch per query. Reddit caps at 100. */
  limit?: number;
  /** Sort: relevance, new, top. Default "relevance". */
  sort?: "relevance" | "new" | "top";
  /** Time window for top/relevance. Default "year". */
  t?: "hour" | "day" | "week" | "month" | "year" | "all";
}

export async function searchReddit(opts: RedditSearchOptions): Promise<RedditPost[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const sort = opts.sort ?? "relevance";
  const t = opts.t ?? "year";
  const params = new URLSearchParams({
    q: opts.query,
    limit: String(limit),
    sort,
    t,
    raw_json: "1",
  });
  let url: string;
  if (opts.subreddit) {
    params.set("restrict_sr", "1");
    url = `https://www.reddit.com/r/${encodeURIComponent(opts.subreddit)}/search.json?${params}`;
  } else {
    url = `https://www.reddit.com/search.json?${params}`;
  }
  const json = await redditFetch(url);
  return parseListing(json).filter((p) => !p.nsfw);
}

// Run several queries in parallel, dedupe by post id, keep the earliest copy.
// Tolerant of partial failure — a single failed query doesn't kill the batch.
export async function searchRedditMany(
  queries: RedditSearchOptions[]
): Promise<RedditPost[]> {
  const results = await Promise.allSettled(queries.map((q) => searchReddit(q)));
  const seen = new Map<string, RedditPost>();
  for (const r of results) {
    if (r.status !== "fulfilled") {
      console.warn("[reddit] one query failed:", r.reason);
      continue;
    }
    for (const post of r.value) {
      if (!seen.has(post.id)) seen.set(post.id, post);
    }
  }
  return Array.from(seen.values());
}

// --- demand-phrase heuristics --------------------------------------------
//
// Quick local check used as a fallback signal when the LLM is unavailable
// (and as a feature input to the LLM ranker). These map to the "tag" each
// post will eventually wear in the UI.

const REQUEST_PATTERNS = [
  /\bis there an? app\b/i,
  /\bany apps? that\b/i,
  /\blooking for an? app\b/i,
  /\brecommend\b.*\bapp\b/i,
  /\bwish there was\b/i,
  /\bdoes (anyone|anybody) know\b/i,
  /\bbest apps? for\b/i,
  /\bneed an? app\b/i,
];

const COMPLAINT_PATTERNS = [
  /\bhate (that|how)\b/i,
  /\bsucks?\b/i,
  /\bso frustrat/i,
  /\bworst\b/i,
  /\balternative to\b/i,
  /\bswitch(ing)? from\b/i,
  /\bgave up on\b/i,
  /\bnot satisfied\b/i,
];

export function localTag(post: RedditPost): "request" | "complaint" | "discussion" {
  const haystack = `${post.title}\n${post.body}`;
  if (REQUEST_PATTERNS.some((re) => re.test(haystack))) return "request";
  if (COMPLAINT_PATTERNS.some((re) => re.test(haystack))) return "complaint";
  return "discussion";
}
