// Keyword ranking — given a keyword + country, returns the ordered list of
// apps that surface in Play / App Store search for that query.
//
// Built on top of lib/store-scraper.ts:
//   - searchPlayStore  → rank-ordered Play app URLs (HTML scrape)
//   - searchAppStore   → rank-ordered iTunes Search results (official JSON API)
//   - fetchStoreListing → per-listing enrichment for Play (title/rating/etc.)
//
// Results are cached in-memory by (keyword, country, lang, store, limit) for
// CACHE_TTL_MS so repeat lookups don't re-scrape. The cache lives only for the
// lifetime of the Node process (a Vercel function instance), which is good
// enough until traffic justifies Redis. Same cache key collision rules as the
// other scrape helpers — case-folded keyword + lowercased options.

import {
  fetchStoreListing,
  searchAppStore,
  searchPlayStore,
  type StoreListing,
} from "./store-scraper";
import type { RankedApp, KeywordRankResult } from "./types";

export type RankStore = "play" | "ios" | "both";
export type { RankedApp, KeywordRankResult };

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_LIMIT = 30;

type CacheEntry = { value: KeywordRankResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(args: {
  keyword: string;
  country: string;
  lang: string;
  store: RankStore;
  limit: number;
}): string {
  return [
    args.keyword.trim().toLowerCase(),
    args.country.toLowerCase(),
    args.lang.toLowerCase(),
    args.store,
    args.limit,
  ].join("|");
}

export async function rankKeyword(args: {
  keyword: string;
  country?: string;
  lang?: string;
  store?: RankStore;
  limit?: number;
}): Promise<KeywordRankResult> {
  const keyword = args.keyword.trim();
  const country = (args.country ?? "us").toLowerCase();
  const lang = (args.lang ?? "en").toLowerCase();
  const store: RankStore = args.store ?? "both";
  const limit = Math.min(Math.max(args.limit ?? 10, 1), MAX_LIMIT);

  if (!keyword) {
    throw new Error("keyword is required");
  }

  const key = cacheKey({ keyword, country, lang, store, limit });
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return { ...hit.value, fromCache: true };
  }

  // Fan out to whichever stores were requested. Each call is best-effort —
  // a failure on one store still yields results from the other when store=both.
  const wantPlay = store === "both" || store === "play";
  const wantIos = store === "both" || store === "ios";

  const [playUrls, iosListings] = await Promise.all([
    wantPlay
      ? searchPlayStore(keyword, { country, locale: lang, limit })
          .catch((err) => {
            console.warn("[keyword-rank] play search failed:", err);
            return [] as string[];
          })
      : Promise.resolve<string[]>([]),
    wantIos
      ? searchAppStore(keyword, { country, limit })
          .catch((err) => {
            console.warn("[keyword-rank] ios search failed:", err);
            return [] as StoreListing[];
          })
      : Promise.resolve<StoreListing[]>([]),
  ]);

  // Play search returns URLs only — fetch each listing in parallel for the
  // enriched fields (title, rating, developer, icon).
  const playListings = await Promise.all(
    playUrls.map((u) =>
      fetchStoreListing(u).catch((err) => {
        console.warn("[keyword-rank] play listing fetch failed:", u, err);
        return null;
      })
    )
  );

  const playApps: Omit<RankedApp, "rank">[] = playListings
    .map((l, i) => ({ url: playUrls[i], listing: l }))
    .filter((p) => p.listing !== null)
    .map(({ url, listing }) => {
      const l = listing as StoreListing;
      return {
        source: "play" as const,
        url,
        appId: l.appId,
        title: l.title,
        developer: l.developer,
        iconUrl: l.iconUrl,
        rating: l.rating,
        ratingCount: l.ratingCount,
        genre: l.genre,
      };
    });

  const iosApps: Omit<RankedApp, "rank">[] = iosListings.map((l) => ({
    source: "ios" as const,
    url: l.url,
    appId: l.appId,
    title: l.title,
    developer: l.developer,
    iconUrl: l.iconUrl,
    rating: l.rating,
    ratingCount: l.ratingCount,
    genre: l.genre,
    price: l.price,
  }));

  // Compose final ranked list per the store option.
  // - "play" → just play, ranked 1..N
  // - "ios"  → just ios, ranked 1..N
  // - "both" → interleave by original rank (round-robin), Play first
  let composed: Omit<RankedApp, "rank">[] = [];
  if (store === "play") composed = playApps.slice(0, limit);
  else if (store === "ios") composed = iosApps.slice(0, limit);
  else {
    // Round-robin interleave so the user sees a fair mix at each rank level.
    const out: Omit<RankedApp, "rank">[] = [];
    const maxLen = Math.max(playApps.length, iosApps.length);
    for (let i = 0; i < maxLen && out.length < limit; i++) {
      if (i < playApps.length && out.length < limit) out.push(playApps[i]);
      if (i < iosApps.length && out.length < limit) out.push(iosApps[i]);
    }
    composed = out;
  }

  const apps: RankedApp[] = composed.map((a, i) => ({ rank: i + 1, ...a }));

  const result: KeywordRankResult = {
    keyword,
    country,
    lang,
    store,
    limit,
    apps,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  };

  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

// Test hook — lets callers clear the cache in tests or after deploy. Not
// wired to any UI today.
export function clearKeywordRankCache(): void {
  cache.clear();
}
