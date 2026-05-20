import { NextResponse } from "next/server";
import { fetchStoreListing, classifyStoreUrl } from "@/lib/store-scraper";
import { extractKeywords } from "@/lib/keywords";
import { calculateScore, strategicAdvisoriesFor } from "@/lib/score";
import { extractPrimaryKeyword } from "@/lib/extract-primary-keyword";
import type { AuditPayload } from "@/lib/types";

// POST /api/audit { url }
// Returns a richer audit payload than the inline score on /score:
//   - real listing fields (title, subtitle/shortDesc, fullDesc) when the
//     scraper succeeds
//   - extracted primary + secondary keywords from the live copy
//   - character usage vs each platform's limits
//   - the deterministic score from lib/score (kept for parity with the inline card)
//
// Falls back gracefully when the scrape fails — the report page can still render
// the deterministic score + the listing-snapshot fields we can derive from the URL.

export const dynamic = "force-dynamic";

const LIMITS = {
  play: { title: 30, shortDesc: 80, fullDesc: 4000 },
  ios:  { title: 30, subtitle: 30, fullDesc: 4000 },
} as const;

// AuditPayload is the canonical shape — re-exported here for callers that
// import from the route file.
export type AuditResponse = AuditPayload;

export async function POST(req: Request) {
  let body: { url?: string; keyword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const userKeyword = body.keyword?.trim().toLowerCase() || null;

  const source = classifyStoreUrl(url);
  const snapshot = extractSnapshot(url);

  // Try to fetch the live listing. We treat any failure as "scrape unavailable"
  // rather than 500'ing — the report still has useful content without it.
  const listing = source ? await fetchStoreListing(url).catch(() => null) : null;

  // Frequency-based keyword extraction — always available when listing exists.
  // Computed first so it can serve as fallback when LLM returns garbage.
  const allKeywords = listing
    ? extractKeywords({
        title: listing.title,
        subtitle: listing.subtitle,
        shortDesc: listing.shortDesc,
        fullDesc: listing.fullDesc,
        brand: listing.developer,
      })
    : [];

  // Keyword priority: user-provided → AI-extracted (validated) → frequency.
  // When the user gives a keyword, it's final — no AI call, no validation.
  let resolvedKeyword: { primary: string; secondary: string } | null;

  if (userKeyword) {
    resolvedKeyword = { primary: userKeyword, secondary: "" };
  } else {
    const aiKeyword = listing
      ? await extractPrimaryKeyword({
          title: listing.title,
          shortDesc: listing.shortDesc,
          subtitle: listing.subtitle,
          fullDesc: listing.fullDesc,
          genre: listing.genre,
        }).catch(() => null)
      : null;
    resolvedKeyword = resolveKeyword(aiKeyword, allKeywords, listing?.developer);
  }

  // Score against the listing when we have one; falls back to a URL-only
  // preview when the scrape fails.
  const scoreListing = listing
    ? {
        title: listing.title,
        shortDesc: listing.shortDesc,
        subtitle: listing.subtitle,
        fullDesc: listing.fullDesc,
        rating: listing.rating,
        ratingCount: listing.ratingCount,
        screenshotUrls: listing.screenshotUrls,
        lastUpdated: listing.lastUpdated,
        source: listing.source,
        genre: listing.genre,
      }
    : null;
  const score = calculateScore(url, scoreListing, resolvedKeyword);

  // Strategic ASO advice — non-scored guidance for what we can't measure.
  const advisories = listing ? strategicAdvisoriesFor(listing) : undefined;

  const characterUsage = listing
    ? buildCharacterUsage(listing.source, listing)
    : [];

  const listingCorpus = listing
    ? `${listing.title ?? ""} ${listing.subtitle ?? ""} ${listing.shortDesc ?? ""} ${listing.fullDesc ?? ""}`.toLowerCase()
    : "";

  function countOccurrences(keyword: string): number {
    if (!keyword || !listingCorpus) return 0;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = listingCorpus.match(new RegExp(`\\b${escaped}\\b`, "gi"));
    return matches?.length ?? 0;
  }

  const response: AuditResponse = {
    url,
    source,
    scrape: {
      ok: !!listing,
      title: listing?.title,
      subtitle: listing?.subtitle,
      shortDesc: listing?.shortDesc,
      fullDesc: listing?.fullDesc,
      rating: listing?.rating,
      ratingCount: listing?.ratingCount,
      screenshotUrls: listing?.screenshotUrls,
      lastUpdated: listing?.lastUpdated,
      developer: listing?.developer,
      genre: listing?.genre,
    },
    advisories,
    snapshot,
    keywords: {
      primary: resolvedKeyword
        ? { word: resolvedKeyword.primary, count: countOccurrences(resolvedKeyword.primary) }
        : allKeywords[0],
      secondary: resolvedKeyword
        ? [
            ...(resolvedKeyword.secondary
              ? [{ word: resolvedKeyword.secondary, count: countOccurrences(resolvedKeyword.secondary) }]
              : []),
            ...allKeywords.filter(
              (k) => k.word !== resolvedKeyword.primary && k.word !== resolvedKeyword.secondary
            ).slice(0, 4),
          ]
        : allKeywords.slice(1, 6),
      totalUnique: allKeywords.length,
    },
    characterUsage,
    score: { score: score.score, grade: score.grade, checks: score.checks },
  };

  return NextResponse.json(response);
}

function extractSnapshot(rawUrl: string): AuditResponse["snapshot"] {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "play.google.com") {
      const id = u.searchParams.get("id") ?? undefined;
      const hl = u.searchParams.get("hl") ?? undefined;
      const gl = u.searchParams.get("gl") ?? undefined;
      const slug = id ? id.split(".").pop() : undefined;
      return { appId: id, slug, country: gl, locale: hl };
    }
    if (u.hostname === "apps.apple.com" || u.hostname === "itunes.apple.com") {
      // /us/app/{slug}/id{numeric}
      const parts = u.pathname.split("/").filter(Boolean);
      const country = parts[0];
      const appIdx = parts.findIndex((p) => p === "app");
      const slug = appIdx >= 0 ? parts[appIdx + 1] : undefined;
      const idPart = parts.find((p) => p.startsWith("id"));
      const appId = idPart?.slice(2);
      return { appId, slug, country };
    }
  } catch {
    // fall through
  }
  return {};
}

type ListingFields = {
  source: "play" | "ios";
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
};

function buildCharacterUsage(
  source: "play" | "ios",
  listing: ListingFields
): AuditResponse["characterUsage"] {
  function row(field: string, value: string | undefined, limit: number) {
    if (!value) {
      return { field, actual: 0, limit, status: "missing" as const };
    }
    const actual = value.length;
    let status: "ok" | "tight" | "over" = "ok";
    if (actual > limit) status = "over";
    else if (actual > limit * 0.9) status = "tight";
    return { field, actual, limit, status };
  }

  if (source === "play") {
    return [
      row("Title", listing.title, LIMITS.play.title),
      row("Short description", listing.shortDesc, LIMITS.play.shortDesc),
      row("Full description", listing.fullDesc, LIMITS.play.fullDesc),
    ];
  }
  return [
    row("Title", listing.title, LIMITS.ios.title),
    row("Subtitle", listing.subtitle, LIMITS.ios.subtitle),
    row("Full description", listing.fullDesc, LIMITS.ios.fullDesc),
  ];
}

// Validate and resolve the primary keyword.
// Priority: user-provided (always trusted) > LLM-extracted (validated) > frequency top-hit.
function resolveKeyword(
  llmResult: { primary: string; secondary: string } | null,
  frequencyKeywords: { word: string; count: number }[],
  developer?: string,
): { primary: string; secondary: string } | null {
  if (!llmResult) {
    // No LLM result — use frequency top hit if available.
    if (frequencyKeywords.length === 0) return null;
    return {
      primary: frequencyKeywords[0].word,
      secondary: frequencyKeywords[1]?.word ?? "",
    };
  }

  const primary = llmResult.primary.trim().toLowerCase();

  if (isValidKeyword(primary, developer)) {
    return { primary, secondary: llmResult.secondary.trim().toLowerCase() };
  }

  // LLM returned garbage — fall back to frequency extraction.
  if (frequencyKeywords.length === 0) return null;
  return {
    primary: frequencyKeywords[0].word,
    secondary: frequencyKeywords[1]?.word ?? "",
  };
}

function isValidKeyword(keyword: string, developer?: string): boolean {
  if (!keyword || keyword.length < 2) return false;
  // Reject keywords containing digits (e.g. "12 testers", "40 000 developers").
  if (/\d/.test(keyword)) return false;
  // Reject URL/protocol fragments.
  if (/^(https?|www|com|org|net|io)$/i.test(keyword)) return false;
  // Reject if it's just the developer/brand name.
  if (developer) {
    const brandLower = developer.toLowerCase().trim();
    if (keyword === brandLower) return false;
  }
  // Reject single common words that aren't real search queries.
  const NOISE = new Set([
    "app", "apps", "free", "best", "new", "the", "and", "for", "you", "your",
  ]);
  if (NOISE.has(keyword)) return false;
  return true;
}
