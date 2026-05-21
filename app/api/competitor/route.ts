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
    keyword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetUrl = body.url?.trim();
  const stores: StoreFilter = body.stores ?? "both";
  // Explicit country always wins. "auto" / empty / undefined falls back to
  // the user's own country, derived from the edge request headers (Vercel /
  // Cloudflare populate these). When neither header is present (local dev),
  // fall back to US.
  const explicitCountry =
    body.country && body.country !== "auto" ? body.country.toLowerCase() : null;
  if (explicitCountry && !/^[a-z]{2}$/.test(explicitCountry)) {
    return NextResponse.json(
      { error: "country must be a 2-letter code or 'auto'" },
      { status: 400 }
    );
  }
  const userCountry = inferUserCountry(req);
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
    ? extractKeywords({
        title: targetListing.title,
        subtitle: targetListing.subtitle,
        shortDesc: targetListing.shortDesc,
        fullDesc: targetListing.fullDesc,
        brand: targetListing.developer,
      })
    : [];
  // Caller-supplied keyword wins over auto-detected. The auto path runs
  // against this exact term, so the user can steer the SERP they care about
  // (e.g. "habit tracker" instead of whatever the title currently leads with).
  const userKeyword = body.keyword?.trim().toLowerCase();
  const searchTerm = userKeyword || targetKeywords[0]?.word;
  // Treat the user-supplied keyword (when present) as the target's primary
  // for downstream relevance scoring + keyword-overlap signals, so the rest
  // of the pipeline aligns with what they asked us to focus on.
  if (userKeyword) {
    targetKeywords.unshift({ word: userKeyword, count: targetKeywords[0]?.count ?? 1 });
  }

  // Determine which competitor URLs to fetch.
  let competitorUrls: string[] = manualCompetitorUrls;
  let discoveryMode: CompetitorAnalysisResult["discoveryMode"] =
    manualCompetitorUrls.length > 0 ? "manual" : "auto";

  // When auto-discovery runs, we scrape candidate listings just to score
  // relevance — pass them through so the downstream "scrape competitors"
  // step doesn't refetch what we already have. Keyed by URL.
  const prefetchedListings = new Map<string, StoreListing>();

  if (competitorUrls.length === 0) {
    // Auto-discover. Run only the searches the caller asked for. When stores
    // is "both" we mix — Play gets PLAY_QUOTA seats, App Store fills the
    // rest, with cross-store backfill. When stores is "play" or "ios", we
    // skip the other source entirely and fill the full slate from one store.
    //
    // Strategy: over-fetch a generous candidate pool from each store, then
    // rank by RELEVANCE before picking the top N. A naive "first 5" ignores
    // the long tail of the keyword search where the actual same-category
    // competitors often live, surfacing tangential apps that just happen to
    // contain the keyword. Scoring fixes that:
    //   + genre match with target (same App Store category)
    //   + how many of the target's top keywords appear in the candidate's
    //     own copy (title, subtitle, descriptions)
    //   − same developer as target (sibling apps, not competitors)
    //   − tiny rating-count (likely abandoned / spam)
    //
    // Self-match: same app on Play vs iOS has different IDs, so we also
    // filter by normalized title to keep the user's own listing out.
    if (searchTerm) {
      const country = explicitCountry ?? userCountry ?? "us";
      const targetAppId = targetListing?.appId;
      const targetSource = classifyStoreUrl(targetUrl);
      const targetTitleKey = normalizeTitle(targetListing?.title);
      const targetGenre = targetListing?.genre?.toLowerCase();
      const targetDeveloper = targetListing?.developer?.toLowerCase();
      const targetKwSet = new Set(targetKeywords.map((k) => k.word));

      const wantIosSource = stores === "both" || stores === "ios";
      const wantPlaySource = stores === "both" || stores === "play";

      // Pool sizes: large enough to surface long-tail relevant apps, but
      // bounded so the Play scrape (one HTTP per URL) doesn't blow the
      // 30s function budget.
      const IOS_POOL = 20;
      const PLAY_POOL = 15;

      const [iosCandidates, playRawUrls] = await Promise.all([
        wantIosSource
          ? searchAppStore(searchTerm, { country, limit: IOS_POOL }).catch(() => [] as StoreListing[])
          : Promise.resolve<StoreListing[]>([]),
        wantPlaySource
          ? searchPlayStore(searchTerm, { country, limit: PLAY_POOL }).catch(() => [] as string[])
          : Promise.resolve<string[]>([]),
      ]);

      // iTunes Search returns full listing data inline; we don't need a
      // second lookup to score. Play's HTML scrape returns URLs only, so
      // we fetch each candidate once and reuse the result downstream.
      const playFetched = await Promise.all(
        playRawUrls.map(async (u) => ({
          url: u,
          listing: await fetchStoreListing(u).catch(() => null),
        }))
      );

      function relevanceScore(listing: StoreListing | null): number {
        if (!listing) return -100; // failed scrape — always last
        let score = 0;
        // Same developer ⇒ likely a sibling app from the same studio, not a
        // competitor. Push it well below any genuine match.
        if (
          targetDeveloper &&
          listing.developer?.toLowerCase() === targetDeveloper
        ) {
          score -= 10;
        }
        // Genre / category alignment. Both stores normalize to human-readable
        // names ("Productivity", "Games") so a case-insensitive equality
        // check is reliable.
        if (
          targetGenre &&
          listing.genre?.toLowerCase() === targetGenre
        ) {
          score += 3;
        }
        // Keyword overlap with the target's top-10 keywords. We use substring
        // search rather than tokenization so multi-word target keywords also
        // catch (extractKeywords yields single tokens today, but this is
        // future-proof and cheap).
        const corpus = [
          listing.title,
          listing.subtitle,
          listing.shortDesc,
          listing.fullDesc,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (corpus) {
          for (const kw of targetKwSet) {
            if (corpus.includes(kw)) score += 1;
          }
        }
        // Tiny rating-count: probably abandoned, a spam clone, or a new
        // launch — none of which the user gains insight from comparing to.
        if (
          typeof listing.ratingCount === "number" &&
          listing.ratingCount < 50
        ) {
          score -= 3;
        }
        return score;
      }

      type Scored = { url: string; listing: StoreListing | null; score: number };

      const iosScored: Scored[] = iosCandidates
        .filter((c) => {
          if (targetSource === "ios" && targetAppId && c.appId === targetAppId) return false;
          if (targetTitleKey && normalizeTitle(c.title) === targetTitleKey) return false;
          return true;
        })
        .map((c) => ({ url: c.url, listing: c, score: relevanceScore(c) }))
        .sort((a, b) => b.score - a.score);

      const playScored: Scored[] = playFetched
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
        .map(({ url, listing }) => ({ url, listing, score: relevanceScore(listing) }))
        .sort((a, b) => b.score - a.score);

      let picks: Scored[] = [];
      if (stores === "play") {
        picks = playScored.slice(0, MAX_COMPETITORS);
      } else if (stores === "ios") {
        picks = iosScored.slice(0, MAX_COMPETITORS);
      } else {
        // "both" — quota mix with backfill from either side if one is short.
        const wantPlay = Math.min(PLAY_QUOTA, playScored.length);
        const wantIos = Math.min(MAX_COMPETITORS - wantPlay, iosScored.length);
        picks = [
          ...playScored.slice(0, wantPlay),
          ...iosScored.slice(0, wantIos),
        ];
        if (picks.length < MAX_COMPETITORS) {
          const remainder = MAX_COMPETITORS - picks.length;
          picks.push(...playScored.slice(wantPlay, wantPlay + remainder));
        }
        if (picks.length < MAX_COMPETITORS) {
          const remainder = MAX_COMPETITORS - picks.length;
          picks.push(...iosScored.slice(wantIos, wantIos + remainder));
        }
      }

      competitorUrls = picks.map((p) => p.url);
      for (const p of picks) {
        if (p.listing) prefetchedListings.set(p.url, p.listing);
      }
    }
  } else if (manualCompetitorUrls.length > 0 && manualCompetitorUrls.length < MAX_COMPETITORS) {
    discoveryMode = "mixed";
  }

  // Scrape competitors in parallel. Reuse the listings the auto-discovery
  // step already fetched — for the manual path the prefetch map is empty so
  // this just runs the scrape as before.
  const competitorListings = await Promise.all(
    competitorUrls.map(async (u) => {
      const cached = prefetchedListings.get(u);
      if (cached) return cached;
      return fetchStoreListing(u).catch(() => null);
    })
  );

  const target = listingToData(targetUrl, targetListing);
  const competitors = competitorUrls.map((u, i) =>
    listingToData(u, competitorListings[i])
  );

  // When the user explicitly told us which keyword they care about, anchor
  // the comparison table to that exact phrase. Target always uses it (that's
  // the search they're competing on, regardless of what's in their title
  // right now). Competitors only switch to it when their own listing
  // actually contains the phrase — otherwise we keep their auto-detected
  // primary so the table still tells the truth about each one.
  if (userKeyword) {
    target.primaryKeyword = {
      word: userKeyword,
      count: countOccurrences(combineCorpus(targetListing), userKeyword),
    };
    for (let i = 0; i < competitors.length; i++) {
      const listing = competitorListings[i];
      if (!listing) continue;
      const occurrences = countOccurrences(combineCorpus(listing), userKeyword);
      if (occurrences > 0) {
        competitors[i].primaryKeyword = { word: userKeyword, count: occurrences };
      }
    }
  }

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

function combineCorpus(l: StoreListing | null): string {
  if (!l) return "";
  return combineCopy(l).toLowerCase();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  const n = needle.toLowerCase();
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(n, i)) !== -1) {
    count++;
    i += n.length;
  }
  return count;
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
  const hasAnyCopy = !!(l.title || l.subtitle || l.shortDesc || l.fullDesc);
  const kws = hasAnyCopy
    ? extractKeywords({
        title: l.title,
        subtitle: l.subtitle,
        shortDesc: l.shortDesc,
        fullDesc: l.fullDesc,
        brand: l.developer,
      })
    : [];
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
    downloads: l.downloads,
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

// Pull the request's country from the edge headers Vercel / Cloudflare set.
// Returns a lowercase 2-letter ISO code, or null when unavailable (local
// dev). Useful for the "auto" country selection — analyses use the country
// the user is browsing from rather than whatever country the target URL
// happens to encode.
function inferUserCountry(req: Request): string | null {
  const headers = req.headers;
  const raw =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country") ??
    null;
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : null;
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

  // Download volume
  if (target.downloads !== undefined) {
    const dlCounts = scraped.map((c) => c.downloads).filter((n): n is number => n !== undefined);
    if (dlCounts.length > 0) {
      const avg = Math.round(dlCounts.reduce((s, n) => s + n, 0) / dlCounts.length);
      const delta = target.downloads - avg;
      out.push({
        label: delta >= 0 ? "Download volume lead" : "Download volume gap",
        detail:
          delta >= 0
            ? `You have ${fmt(target.downloads)} downloads vs a competitor average of ${fmt(avg)}.`
            : `You have ${fmt(target.downloads)} downloads vs a competitor average of ${fmt(avg)}. Competitors average ${fmt(avg - target.downloads)} more downloads.`,
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
