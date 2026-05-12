import { NextResponse } from "next/server";
import {
  classifyStoreUrl,
  fetchStoreListing,
  searchAppStore,
  searchPlayStore,
  type StoreListing,
} from "@/lib/store-scraper";
import { extractKeywords } from "@/lib/keywords";
import type {
  CompetitorAnalysisResult,
  CompetitorAppData,
  CompetitorInsight,
} from "@/lib/types";

// POST /api/competitor { url, competitors?: string[] }
//
// Returns a CompetitorAnalysisResult. Two discovery modes:
//   - manual: caller provides 1-5 competitor URLs explicitly
//   - auto:   caller provides only their own URL; for iOS we use the iTunes
//             Search API to find similar apps by genre + primary keyword.
//             Play has no public search API, so auto-discovery there falls
//             back to "no competitors found — paste URLs manually."

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_COMPETITORS = 5;
// Target mix for auto-discovery: at least this many Play Store competitors,
// remainder filled with App Store results. Caller-pasted URLs are still
// honored as-is (no rebalancing).
const PLAY_QUOTA = 3;

type StoreFilter = "both" | "play" | "ios";

export async function POST(req: Request) {
  let body: {
    url?: string;
    competitors?: string[];
    stores?: StoreFilter;
    country?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetUrl = body.url?.trim();
  const stores: StoreFilter = body.stores ?? "both";
  // Explicit country always wins. "auto" / empty / undefined falls back to
  // whatever country the URL itself encodes (US for /us/app/..., IN for ?gl=in).
  const explicitCountry =
    body.country && body.country !== "auto" ? body.country.toLowerCase() : null;
  if (explicitCountry && !/^[a-z]{2}$/.test(explicitCountry)) {
    return NextResponse.json(
      { error: "country must be a 2-letter code or 'auto'" },
      { status: 400 }
    );
  }
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  if (!classifyStoreUrl(targetUrl)) {
    return NextResponse.json(
      { error: "URL must point at an App Store or Google Play listing." },
      { status: 400 }
    );
  }

  const manualCompetitorUrls = (body.competitors ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
    .filter((u) => classifyStoreUrl(u))
    .slice(0, MAX_COMPETITORS);

  // Scrape target first so we know the genre + primary keyword for auto-discovery.
  const targetListing = await fetchStoreListing(targetUrl).catch(() => null);

  const targetKeywords = targetListing
    ? extractKeywords(combineCopy(targetListing))
    : [];
  const targetPrimaryKw = targetKeywords[0];

  // Determine which competitor URLs to fetch.
  let competitorUrls: string[] = manualCompetitorUrls;
  let discoveryMode: CompetitorAnalysisResult["discoveryMode"] =
    manualCompetitorUrls.length > 0 ? "manual" : "auto";

  if (competitorUrls.length === 0) {
    // Auto-discover. Run only the searches the caller asked for. When stores
    // is "both" we mix — Play gets PLAY_QUOTA seats, App Store fills the
    // rest, with cross-store backfill. When stores is "play" or "ios", we
    // skip the other source entirely and fill the full slate from one store.
    //
    // Cross-store self-match: same app on Play vs iOS has different IDs
    // (com.duolingo vs 570060128). We additionally filter by normalized
    // title so the user's own listing on the other store doesn't sneak in.
    if (targetPrimaryKw) {
      const country = explicitCountry ?? inferCountry(targetUrl) ?? "us";
      const targetAppId = targetListing?.appId;
      const targetSource = classifyStoreUrl(targetUrl);
      const targetTitleKey = normalizeTitle(targetListing?.title);

      const wantIosSource = stores === "both" || stores === "ios";
      const wantPlaySource = stores === "both" || stores === "play";

      const [iosCandidates, playRawUrls] = await Promise.all([
        wantIosSource
          ? searchAppStore(targetPrimaryKw.word, { country, limit: MAX_COMPETITORS + 5 })
          : Promise.resolve([]),
        wantPlaySource
          ? searchPlayStore(targetPrimaryKw.word, { country, limit: MAX_COMPETITORS + 5 })
          : Promise.resolve<string[]>([]),
      ]);

      // For Play, we only have URLs from the search page — to title-filter
      // we need to peek at each listing. Scrape them now (we'd scrape anyway
      // downstream) so the filter has data, then keep the cache for reuse.
      const playPeeks = await Promise.all(
        playRawUrls.map(async (u) => ({ url: u, listing: await fetchStoreListing(u).catch(() => null) }))
      );

      const iosFiltered = iosCandidates
        .filter((c) => {
          if (targetSource === "ios" && targetAppId && c.appId === targetAppId) return false;
          if (targetTitleKey && normalizeTitle(c.title) === targetTitleKey) return false;
          return true;
        })
        .map((c) => c.url);

      const playFiltered = playPeeks
        .filter(({ url, listing }) => {
          if (targetSource === "play" && targetAppId) {
            try {
              if (new URL(url).searchParams.get("id") === targetAppId) return false;
            } catch {
              /* noop */
            }
          }
          if (targetTitleKey && normalizeTitle(listing?.title) === targetTitleKey) return false;
          return true;
        })
        .map(({ url }) => url);

      let picks: string[] = [];
      if (stores === "play") {
        picks = playFiltered.slice(0, MAX_COMPETITORS);
      } else if (stores === "ios") {
        picks = iosFiltered.slice(0, MAX_COMPETITORS);
      } else {
        // "both" — quota mix with backfill from either side if one is short.
        const wantPlay = Math.min(PLAY_QUOTA, playFiltered.length);
        const wantIos = Math.min(MAX_COMPETITORS - wantPlay, iosFiltered.length);
        picks = [
          ...playFiltered.slice(0, wantPlay),
          ...iosFiltered.slice(0, wantIos),
        ];
        if (picks.length < MAX_COMPETITORS) {
          const remainder = MAX_COMPETITORS - picks.length;
          picks.push(...playFiltered.slice(wantPlay, wantPlay + remainder));
        }
        if (picks.length < MAX_COMPETITORS) {
          const remainder = MAX_COMPETITORS - picks.length;
          picks.push(...iosFiltered.slice(wantIos, wantIos + remainder));
        }
      }
      competitorUrls = picks;
    }
  } else if (manualCompetitorUrls.length > 0 && manualCompetitorUrls.length < MAX_COMPETITORS) {
    discoveryMode = "mixed";
  }

  // Scrape competitors in parallel.
  const competitorListings = await Promise.all(
    competitorUrls.map((u) => fetchStoreListing(u).catch(() => null))
  );

  const target = listingToData(targetUrl, targetListing);
  const competitors = competitorUrls.map((u, i) =>
    listingToData(u, competitorListings[i])
  );

  const insights = buildInsights(target, competitors);
  const keywordOverlap = buildKeywordOverlap(target, competitors);

  const payload: CompetitorAnalysisResult = {
    target,
    competitors,
    insights,
    discoveryMode,
    keywordOverlap,
  };

  return NextResponse.json(payload);
}

// --- helpers -------------------------------------------------------------

function combineCopy(l: StoreListing): string {
  return [l.title, l.shortDesc, l.subtitle, l.fullDesc].filter(Boolean).join(" ");
}

function listingToData(url: string, l: StoreListing | null): CompetitorAppData {
  const source = classifyStoreUrl(url);
  if (!l) {
    return {
      url,
      source,
      scrapeOk: false,
      secondaryKeywords: [],
      titleLength: 0,
      shortDescLength: 0,
      fullDescLength: 0,
    };
  }
  const corpus = combineCopy(l);
  const kws = corpus.trim() ? extractKeywords(corpus) : [];
  return {
    url,
    source,
    scrapeOk: true,
    title: l.title,
    developer: l.developer,
    genre: l.genre,
    iconUrl: l.iconUrl,
    rating: l.rating,
    ratingCount: l.ratingCount,
    appId: l.appId,
    primaryKeyword: kws[0],
    secondaryKeywords: kws.slice(1, 6),
    titleLength: l.title?.length ?? 0,
    shortDescLength: l.shortDesc?.length ?? 0,
    fullDescLength: l.fullDesc?.length ?? 0,
    shortDesc: l.shortDesc,
    lastUpdated: l.lastUpdated,
    price: l.price,
  };
}

// Normalize an app title for cross-store self-match detection.
// Lowercases, strips punctuation, and collapses whitespace — but keeps the
// WHOLE title (no segment-splitting). Previous version split on ": " / " - "
// and kept only the first segment, which over-filtered generic-name apps
// (e.g. for target "12 Testers - Testers Community" → "12 testers", every
// other competitor starting with "12 testers" would get wrongly dropped as
// "same app on the other store"). Full-title equality still catches the
// genuine cross-store case (e.g. both iOS and Play list "Duolingo: Language
// Lessons" with that exact title).
function normalizeTitle(title: string | undefined): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCountry(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("apple.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[0] ?? null;
    }
    if (u.hostname === "play.google.com") {
      return u.searchParams.get("gl");
    }
  } catch {
    /* noop */
  }
  return null;
}

function buildInsights(
  target: CompetitorAppData,
  competitors: CompetitorAppData[]
): CompetitorInsight[] {
  const out: CompetitorInsight[] = [];
  const scraped = competitors.filter((c) => c.scrapeOk);
  if (scraped.length === 0) {
    out.push({
      label: "No competitor data",
      detail: "We couldn't fetch any of the competitor listings. Try pasting URLs manually.",
      tone: "warning",
    });
    return out;
  }

  // Rating delta
  if (target.rating !== undefined) {
    const ratings = scraped.map((c) => c.rating).filter((r): r is number => r !== undefined);
    if (ratings.length > 0) {
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
      const delta = +(target.rating - avg).toFixed(2);
      out.push({
        label: delta >= 0 ? "Rating advantage" : "Rating gap",
        detail:
          delta >= 0
            ? `You're rated ${target.rating.toFixed(1)} vs an average of ${avg.toFixed(1)} across ${ratings.length} competitor${ratings.length === 1 ? "" : "s"}. You're ahead by ${delta.toFixed(2)} stars.`
            : `You're rated ${target.rating.toFixed(1)} vs an average of ${avg.toFixed(1)}. You're behind by ${Math.abs(delta).toFixed(2)} stars — review the lowest-rated checks first.`,
        tone: delta >= 0 ? "positive" : "warning",
      });
    }
  }

  // Review volume
  if (target.ratingCount !== undefined) {
    const counts = scraped.map((c) => c.ratingCount).filter((n): n is number => n !== undefined);
    if (counts.length > 0) {
      const avg = Math.round(counts.reduce((s, n) => s + n, 0) / counts.length);
      const delta = target.ratingCount - avg;
      out.push({
        label: delta >= 0 ? "Review volume edge" : "Review volume gap",
        detail:
          delta >= 0
            ? `You have ${fmt(target.ratingCount)} ratings vs a competitor average of ${fmt(avg)}.`
            : `You have ${fmt(target.ratingCount)} ratings vs a competitor average of ${fmt(avg)}. Competitors are reviewed ${fmt(avg - target.ratingCount)} more times on average.`,
        tone: delta >= 0 ? "positive" : "warning",
      });
    }
  }

  // Title length
  const titleLens = scraped.map((c) => c.titleLength).filter((n) => n > 0);
  if (titleLens.length > 0 && target.titleLength > 0) {
    const avg = Math.round(titleLens.reduce((s, n) => s + n, 0) / titleLens.length);
    if (Math.abs(target.titleLength - avg) >= 6) {
      out.push({
        label: target.titleLength > avg ? "Title runs longer than peers" : "Title runs shorter than peers",
        detail: `Your title is ${target.titleLength} chars vs an average of ${avg}. ${target.titleLength > avg ? "Consider trimming — long titles risk truncation on smaller devices." : "You may have room to add a keyword phrase to the title."}`,
        tone: "neutral",
      });
    }
  }

  // Primary keyword overlap
  if (target.primaryKeyword) {
    const matches = scraped.filter(
      (c) => c.primaryKeyword?.word === target.primaryKeyword!.word
    ).length;
    if (matches > 0) {
      out.push({
        label: "Crowded primary keyword",
        detail: `${matches} of ${scraped.length} competitors share your primary keyword "${target.primaryKeyword.word}". Differentiate by leading the title with a more specific phrase.`,
        tone: "warning",
      });
    } else {
      out.push({
        label: "Distinct positioning",
        detail: `No scraped competitor shares your primary keyword "${target.primaryKeyword.word}" — you have clear airspace on this term.`,
        tone: "positive",
      });
    }
  }

  return out;
}

function buildKeywordOverlap(
  target: CompetitorAppData,
  competitors: CompetitorAppData[]
): CompetitorAnalysisResult["keywordOverlap"] {
  const map = new Map<string, { competitorsCount: number; targetHas: boolean }>();
  const targetWords = new Set<string>();
  if (target.primaryKeyword) targetWords.add(target.primaryKeyword.word);
  target.secondaryKeywords.forEach((k) => targetWords.add(k.word));

  for (const c of competitors) {
    const cwords = new Set<string>();
    if (c.primaryKeyword) cwords.add(c.primaryKeyword.word);
    c.secondaryKeywords.forEach((k) => cwords.add(k.word));
    cwords.forEach((w) => {
      const prev = map.get(w) ?? { competitorsCount: 0, targetHas: targetWords.has(w) };
      prev.competitorsCount += 1;
      map.set(w, prev);
    });
  }
  // Also include target-only keywords (where competitorsCount stays 0)
  targetWords.forEach((w) => {
    if (!map.has(w)) {
      map.set(w, { competitorsCount: 0, targetHas: true });
    } else {
      map.get(w)!.targetHas = true;
    }
  });

  return Array.from(map.entries())
    .map(([word, v]) => ({ word, ...v }))
    .sort(
      (a, b) =>
        b.competitorsCount - a.competitorsCount ||
        Number(b.targetHas) - Number(a.targetHas)
    )
    .slice(0, 12);
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
