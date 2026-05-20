import type { ScrapedReview } from "@/lib/types";
import { classifyStoreUrl } from "@/lib/store-scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const COUNTRY_LANG: Record<string, string> = {
  us: "en", gb: "en", au: "en", ca: "en", in: "en",
  de: "de", fr: "fr", br: "pt", jp: "ja", kr: "ko",
  es: "es", it: "it", nl: "nl", ru: "ru", mx: "es",
};

interface ReviewsRequest {
  url?: string;
  country?: string;
}

export async function POST(req: Request) {
  let body: ReviewsRequest;
  try {
    body = (await req.json()) as ReviewsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url?.trim()) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const url = body.url.trim();
  const country = body.country?.trim().toLowerCase() || "";
  const source = classifyStoreUrl(url);

  if (!source) {
    return Response.json(
      { error: "URL must be a Google Play or App Store link" },
      { status: 400 }
    );
  }

  try {
    const reviews =
      source === "play"
        ? await scrapePlayReviews(url, country)
        : await scrapeAppStoreReviews(url, country);

    return Response.json({ reviews, store: source });
  } catch (err) {
    console.error("[/api/reviews] scrape failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to scrape reviews" },
      { status: 500 }
    );
  }
}

// ─── Google Play reviews ─────────────────────────────────────────────────
// Uses Google's internal batchexecute RPC endpoint — the same one the Play
// Store web app calls when loading reviews. Returns structured data rather
// than brittle HTML parsing.

async function scrapePlayReviews(url: string, country: string): Promise<ScrapedReview[]> {
  const appId = extractPlayAppId(url);
  if (!appId) return [];

  const gl = country || extractPlayCountry(url) || "us";
  const hl = COUNTRY_LANG[gl] ?? "en";

  const fromBatch = await fetchPlayReviewsBatch(appId, gl, hl);
  if (fromBatch.length >= 5) return fromBatch;

  const html = await fetchHtml(
    `https://play.google.com/store/apps/details?id=${appId}&hl=${hl}&gl=${gl}`
  );
  if (!html) return fromBatch;

  const fromHtml = parsePlayReviewsFromHtml(html, appId);
  const seen = new Set(fromBatch.map((r) => r.text.slice(0, 50).toLowerCase()));
  for (const r of fromHtml) {
    if (!seen.has(r.text.slice(0, 50).toLowerCase())) {
      fromBatch.push(r);
    }
  }
  return fromBatch;
}

function extractPlayAppId(url: string): string | null {
  try {
    return new URL(url).searchParams.get("id");
  } catch {
    return null;
  }
}

function extractPlayCountry(url: string): string | null {
  try {
    return new URL(url).searchParams.get("gl");
  } catch {
    return null;
  }
}

async function fetchPlayReviewsBatch(appId: string, gl: string, hl: string): Promise<ScrapedReview[]> {
  const allReviews: ScrapedReview[] = [];
  let pageToken: string | null = null;

  for (let page = 0; page < 5; page++) {
    const innerPayload = pageToken
      ? [null, null, [2, 1, [150, pageToken], null, null], [appId, 7]]
      : [null, null, [2, 1, [150], null, null], [appId, 7]];

    const payload = `f.req=${encodeURIComponent(
      JSON.stringify([
        [["UsvDTd", JSON.stringify(innerPayload), null, "generic"]],
      ])
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://play.google.com/_/PlayStoreUi/data/batchexecute?hl=${hl}&gl=${gl}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "User-Agent": USER_AGENT,
          },
          body: payload,
          signal: controller.signal,
          cache: "no-store",
        }
      );

      if (!res.ok) break;
      const text = await res.text();

      const cleaned = text.replace(/^\)}\]'\n/, "");
      const lines = cleaned.split("\n").filter((l) => l.trim().startsWith("["));

      let pageAdded = 0;
      let nextToken: string | null = null;

      for (const line of lines) {
        try {
          const outer = JSON.parse(line);
          const innerStr = outer?.[0]?.[2];
          if (!innerStr || typeof innerStr !== "string") continue;

          const inner = JSON.parse(innerStr);
          const entries = inner?.[0];
          if (!Array.isArray(entries)) continue;

          // Pagination token is at inner[1][1]
          const token = inner?.[1]?.[1];
          if (typeof token === "string" && token.length > 0) nextToken = token;

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (!Array.isArray(entry)) continue;

            const reviewText = entry[4]?.toString().trim();
            if (!reviewText || reviewText.length < 5) continue;

            const rating = Number(entry[2]);
            if (rating < 1 || rating > 5) continue;

            const timestamp = entry[5]?.[0];
            const date = timestamp
              ? new Date(Number(timestamp) * 1000).toISOString().split("T")[0]
              : "";

            const reviewerName = entry[1]?.[0]?.toString();
            const helpfulCount = typeof entry[6] === "number" ? entry[6] : undefined;
            const version = entry[10]?.toString();

            allReviews.push({
              id: `play_${appId}_${page}_${i}`,
              text: reviewText,
              rating,
              date,
              version,
              helpfulCount,
              reviewerName,
              store: "play",
            });
            pageAdded++;
          }
        } catch {
          continue;
        }
      }

      if (pageAdded === 0 || !nextToken) break;
      pageToken = nextToken;
    } catch {
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return allReviews;
}

function parsePlayReviewsFromHtml(
  html: string,
  appId: string
): ScrapedReview[] {
  const reviews: ScrapedReview[] = [];

  // Find review blocks by the star rating aria-label
  const ratingRe = /aria-label="Rated (\d) stars? out of five stars?"/g;
  const positions: { index: number; rating: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = ratingRe.exec(html)) !== null) {
    positions.push({ index: m.index, rating: Number(m[1]) });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = positions[i + 1]?.index ?? Math.min(start + 5000, html.length);
    const block = html.slice(start, end);

    // Extract review text — look for the longest meaningful text span
    const spans = [...block.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)];
    const texts = spans
      .map((s) => stripHtml(s[1]).trim())
      .filter(
        (t) =>
          t.length > 20 &&
          !/^\d+ people? found/i.test(t) &&
          !/^Did you find this/i.test(t) &&
          !/^Rated \d/i.test(t)
      );

    if (texts.length === 0) continue;
    const text = texts.sort((a, b) => b.length - a.length)[0];

    const dateMatch = block.match(/(\w+ \d{1,2}, \d{4})/);
    const date = dateMatch ? dateMatch[1] : "";

    reviews.push({
      id: `play_html_${appId}_${i}`,
      text,
      rating: positions[i].rating,
      date,
      store: "play",
    });
  }

  return reviews;
}

// ─── App Store reviews ───────────────────────────────────────────────────
// Apple provides an RSS feed of recent reviews per app per country:
// https://itunes.apple.com/{country}/rss/customerreviews/page={n}/id={trackId}/sortBy=mostRecent/json

async function scrapeAppStoreReviews(url: string, countryOverride: string): Promise<ScrapedReview[]> {
  const parsed = parseAppStoreUrl(url);
  if (!parsed?.trackId) return [];

  const country = countryOverride || parsed.country || "us";
  const allReviews: ScrapedReview[] = [];

  // Fetch up to 10 pages (~50 reviews each)
  for (let page = 1; page <= 10; page++) {
    const feedUrl = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${parsed.trackId}/sortBy=mostRecent/json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(feedUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = await res.json();

      const entries = data?.feed?.entry;
      if (!Array.isArray(entries)) break;

      let added = 0;
      for (const entry of entries) {
        if (!entry?.content?.label) continue;

        const text = String(entry.content.label).trim();
        if (text.length < 5) continue;

        const rating = Number(entry["im:rating"]?.label ?? 0);
        if (rating < 1 || rating > 5) continue;

        allReviews.push({
          id: `ios_${parsed.trackId}_${entry.id?.label ?? allReviews.length}`,
          text,
          rating,
          date: entry.updated?.label ?? "",
          version: entry["im:version"]?.label,
          reviewerName: entry.author?.name?.label,
          store: "ios",
        });
        added++;
      }

      // If page returned no new reviews, stop fetching
      if (added === 0) break;
    } catch {
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return allReviews;
}

function parseAppStoreUrl(
  url: string
): { trackId?: string; country?: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const country = parts[0];
    const idPart = parts.find((p) => p.startsWith("id"));
    const trackId = idPart?.slice(2);
    return { trackId, country };
  } catch {
    return null;
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
