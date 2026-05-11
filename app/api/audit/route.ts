import { NextResponse } from "next/server";
import { fetchStoreListing, classifyStoreUrl } from "@/lib/store-scraper";
import { extractKeywords } from "@/lib/keywords";
import { calculateScore } from "@/lib/score";

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

export interface AuditResponse {
  url: string;
  source: "play" | "ios" | null;
  scrape: {
    ok: boolean;
    title?: string;
    subtitle?: string;
    shortDesc?: string;
    fullDesc?: string;
  };
  snapshot: {
    appId?: string;
    slug?: string;
    country?: string;
    locale?: string;
    detectedCategory?: string;
  };
  keywords: {
    primary?: { word: string; count: number };
    secondary: { word: string; count: number }[];
    totalUnique: number;
  };
  characterUsage: Array<{
    field: string;
    actual: number;
    limit: number;
    status: "ok" | "tight" | "over" | "missing";
  }>;
  score: {
    score: number;
    grade: string;
  };
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const source = classifyStoreUrl(url);
  const snapshot = extractSnapshot(url);
  const score = calculateScore(url);

  // Try to fetch the live listing. We treat any failure as "scrape unavailable"
  // rather than 500'ing — the report still has useful content without it.
  const listing = source ? await fetchStoreListing(url).catch(() => null) : null;

  const corpus = [
    listing?.title ?? "",
    listing?.shortDesc ?? "",
    listing?.subtitle ?? "",
    listing?.fullDesc ?? "",
  ].join(" ");
  const allKeywords = corpus.trim() ? extractKeywords(corpus) : [];

  const characterUsage = listing
    ? buildCharacterUsage(listing.source, listing)
    : [];

  const response: AuditResponse = {
    url,
    source,
    scrape: {
      ok: !!listing,
      title: listing?.title,
      subtitle: listing?.subtitle,
      shortDesc: listing?.shortDesc,
      fullDesc: listing?.fullDesc,
    },
    snapshot,
    keywords: {
      primary: allKeywords[0],
      secondary: allKeywords.slice(1, 6),
      totalUnique: allKeywords.length,
    },
    characterUsage,
    score: { score: score.score, grade: score.grade },
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
