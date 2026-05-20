// Per-category ASO benchmarks loader.
//
// Reads data/corpus/benchmarks.json (built by scripts/build-corpus.mjs +
// scripts/analyze-corpus.mjs) and exposes per-category length distributions,
// opener-pattern shares, bullet-character preferences, and category-defining
// vocabulary. The scorer and prompt builder use this to apply standards that
// reflect what's already working in each category — instead of a single
// hardcoded set of thresholds.
//
// Loaded synchronously at module init from disk; cached for the process
// lifetime. Server-only by construction (fs).

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Distribution {
  n: number;
  min: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  max: number;
  mean: number;
}

export interface VocabEntry { word: string; count: number }

export interface ExampleListing {
  source: "play" | "ios";
  title: string;
  shortDesc?: string;
  fullDesc: string;
  rating?: number;
  appId?: string;
}

export interface CategoryBenchmarks {
  sampleSize: number;
  titleLength: Distribution;
  shortDescLength: Distribution | null;
  fullDescLength: Distribution;
  hookLength: Distribution;
  sectionCount: Distribution;
  rating: Distribution;
  ratingCountP50: number;
  screenshotCount: Distribution | null;
  monthsSinceUpdate: Distribution | null;
  dominantBullet: string;
  bulletCharFrequency: Record<string, number>;
  listingsWithBullets: number;
  listingsAnalyzed: number;
  openerPatternShare: {
    brandLinking: number;
    imperative: number;
    scenario: number;
    question: number;
    other: number;
  };
  emojiBodiesShare: number;
  exclamationBodiesShare: number;
  benefitLexiconHits: Record<string, number>;
  shortDescOpenerVerbs: Record<string, number>;
  topVocabulary: {
    unigrams: VocabEntry[];
    bigrams: VocabEntry[];
  };
  exampleListings?: ExampleListing[];
}

export interface BenchmarksFile {
  generatedAt: string;
  totalApps: number;
  categories: string[];
  benchmarks: Record<string, CategoryBenchmarks>;
}

// ---- Genre → slug mapping ------------------------------------------------
//
// Genre strings on the live scrape look like "Productivity",
// "Health & Fitness", "Health and fitness", "Photo Video", etc., depending
// on whether they came from iOS or Play. The slug is what the corpus is
// keyed by — lowercase + underscores. The mapping is intentionally tolerant
// of casing and punctuation: we lowercase, strip non-alphanumeric chars,
// and check for substrings.

const SLUG_ORDER = [
  "health_fitness",
  "photo_video",
  "social",
  "lifestyle",
  "education",
  "utilities",
  "business",
  "entertainment",
  "productivity",
  "finance",
] as const;

const SLUG_PATTERNS: Record<string, RegExp[]> = {
  productivity:    [/productivity/, /tools/, /office/],
  finance:         [/finance/, /banking/, /investment/],
  health_fitness:  [/health/, /fitness/, /medical/],
  photo_video:     [/photo/, /video/, /camera/],
  social:          [/social/, /communication/, /dating/],
  lifestyle:       [/lifestyle/, /shopping/, /food/, /travel/],
  education:       [/education/, /reference/, /book/],
  utilities:       [/utilit/, /personalization/, /system/],
  business:        [/business/, /productivity\s+business/],
  entertainment:   [/entertain/, /music/, /movie/],
};

export function genreToCategory(genre?: string | null): string | null {
  if (!genre) return null;
  const normalized = genre.toLowerCase();
  for (const slug of SLUG_ORDER) {
    if (SLUG_PATTERNS[slug].some((re) => re.test(normalized))) return slug;
  }
  return null;
}

// ---- File loading --------------------------------------------------------

let cache: BenchmarksFile | null = null;

function loadBenchmarks(): BenchmarksFile {
  if (cache) return cache;
  try {
    const path = join(process.cwd(), "data", "corpus", "benchmarks.json");
    const raw = readFileSync(path, "utf8");
    cache = JSON.parse(raw);
    return cache!;
  } catch {
    // If the file is missing (fresh checkout that hasn't run the build
    // scripts), serve an empty stub. Callers fall back to _default which
    // will itself be missing — they should handle null benchmarks
    // gracefully.
    cache = {
      generatedAt: "",
      totalApps: 0,
      categories: [],
      benchmarks: {},
    };
    return cache!;
  }
}

export function getBenchmarks(genreOrSlug?: string | null): {
  category: string;
  data: CategoryBenchmarks | null;
} {
  const file = loadBenchmarks();
  const slug = genreOrSlug
    ? (file.benchmarks[genreOrSlug] ? genreOrSlug : genreToCategory(genreOrSlug))
    : null;
  if (slug && file.benchmarks[slug]) {
    return { category: slug, data: file.benchmarks[slug] };
  }
  if (file.benchmarks._default) {
    return { category: "_default", data: file.benchmarks._default };
  }
  return { category: "_default", data: null };
}

// Convenience: format a length range for prompt copy, derived from a
// distribution. We use p25–p75 as the "comfortable" band and p90 as the
// upper guardrail.
export function comfortableRange(d: Distribution | null | undefined): {
  low: number;
  high: number;
  median: number;
  ceiling: number;
} | null {
  if (!d) return null;
  return {
    low: d.p25,
    high: d.p75,
    median: d.p50,
    ceiling: d.p90,
  };
}
