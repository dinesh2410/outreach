// Reddit search helpers — shells out to curl to bypass Reddit's TLS
// fingerprint blocking of Node.js fetch.
//
// We do NOT trust any field shape — Reddit silently changes payloads and the
// JSON often contains nulls in places the docs claim are strings. Every field
// is read defensively.

import { execFile } from "node:child_process";

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

// --- low-level curl fetch ------------------------------------------------

function curlFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "curl.exe",
      [
        "-s",
        "-L",
        "--max-time", "10",
        "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "-H", "Accept: application/json",
        "-H", "Accept-Language: en-US,en;q=0.9",
        url,
      ],
      { maxBuffer: 5 * 1024 * 1024, timeout: 15000 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`curl failed for ${url}: ${err.message} | stderr: ${stderr}`));
          return;
        }
        if (!stdout || stdout.startsWith("<")) {
          reject(new Error(`Reddit returned HTML or empty for ${url}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

async function redditFetch(url: string): Promise<unknown> {
  const text = await curlFetch(url);
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
  /** Sort: relevance, new, top. Default "new". */
  sort?: "relevance" | "new" | "top";
  /** Time window for top/relevance. Default "year". */
  t?: "hour" | "day" | "week" | "month" | "year" | "all";
}

export async function searchReddit(opts: RedditSearchOptions): Promise<RedditPost[]> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const sort = opts.sort ?? "new";
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
