import { execFile } from "node:child_process";

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdAt: string;
  permalink: string;
  author: string;
  nsfw: boolean;
}

function curlFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
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
      },
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

export interface RedditSearchOptions {
  query: string;
  subreddit?: string;
  limit?: number;
  sort?: "relevance" | "new" | "top";
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

export async function searchRedditMany(
  queries: RedditSearchOptions[],
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

export async function fetchSubredditNew(
  subreddit: string,
  limit = 100,
): Promise<RedditPost[]> {
  const cap = Math.min(Math.max(limit, 1), 100);
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${cap}&raw_json=1`;
  const json = await redditFetch(url);
  return parseListing(json).filter((p) => !p.nsfw);
}

export async function fetchAndMatchKeywords(
  subreddits: string[],
  keywords: string[],
  limit = 100,
): Promise<RedditPost[]> {
  const results = await Promise.allSettled(
    subreddits.map((sub) => fetchSubredditNew(sub, limit)),
  );
  const seen = new Map<string, RedditPost>();
  for (const r of results) {
    if (r.status !== "fulfilled") {
      console.warn("[reddit] subreddit feed failed:", r.reason);
      continue;
    }
    for (const post of r.value) {
      if (seen.has(post.id)) continue;
      const kw = post.title.toLowerCase() + " " + post.body.toLowerCase();
      if (keywords.some((k) => kw.includes(k.toLowerCase()))) {
        seen.set(post.id, post);
      }
    }
  }
  return Array.from(seen.values());
}
