#!/usr/bin/env node
// Per-category benchmarks analyzer.
//
// Reads data/corpus/raw/*.json (output of build-corpus.mjs) and derives
// category-level benchmarks for the scorer and generator:
//   - title length p25/p50/p75 + max observed
//   - shortDesc length distribution (Play only — iOS doesn't return subtitle)
//   - fullDesc length distribution
//   - hook (first paragraph) length distribution
//   - section count distribution
//   - bullet character frequencies (•, -, *, ▶, ◉, →)
//   - opener pattern share — "[Brand] is/lets/helps" vs imperative vs scenario
//   - benefit lexicon hit rates per category
//   - top single-word and bigram vocabulary per category
//   - rating distribution + median rating count
//   - screenshot count median
//   - update freshness (months since last update) median
//   - emoji/exclamation incidence
//
// Output:
//   data/corpus/benchmarks.json — keyed by category slug, with a "_default"
//   entry that aggregates across all categories. Score.ts and prompt.ts read
//   this at request time to apply category-aware standards.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const RAW_DIR = join(PROJECT_ROOT, "data", "corpus", "raw");
const OUT_FILE = join(PROJECT_ROOT, "data", "corpus", "benchmarks.json");

// Words/phrases the scorer recognises as benefit signals. The analyzer counts
// how often each appears across the category corpus so we know which terms
// are category-defining vs. generic.
const BENEFIT_LEXICON = [
  "privacy", "private", "secure", "encryption", "encrypted",
  "free", "easy", "easily", "simple", "quick", "fast",
  "share", "shared", "anywhere", "offline", "sync",
  "help", "built-in", "automatic", "automatically", "one place",
];

// Hook-opener vocabularies (kept in sync with score.ts).
const HOOK_VERB_OPENERS = [
  "use", "browse", "learn", "explore", "get", "start", "stay", "make",
  "create", "discover", "join", "listen", "watch", "send", "track", "manage",
  "find", "save", "share", "build", "connect", "store", "back up",
  "chat", "open", "edit", "scan", "plan", "play", "read", "design", "shop",
];
const HOOK_LINKING_VERBS = ["is", "lets", "helps", "brings", "gives", "puts", "makes"];
const SCENARIO_OPENERS = ["whether", "looking for", "ready to", "from", "with"];

const BULLET_CHARS = ["•", "◦", "●", "-", "*", "▶", "◉", "►", "→"];
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","of","to","in","on","at","for","with","by",
  "from","as","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","can","could","should","may","might","must",
  "you","your","yours","we","our","ours","they","their","theirs","it","its",
  "this","that","these","those","i","me","my","mine","he","him","his","she",
  "her","hers","what","which","who","whom","when","where","why","how","all",
  "any","both","each","few","more","most","other","some","such","no","nor",
  "not","only","own","same","so","than","too","very","just","also","one","two",
  "three","new","get","use","make","like","up","out","if","then","there","into",
  "about","over","under","through","while","because","until","during","without",
  "between","upon","since","whether","app","apps","ios","android","play",
  "store","google","apple","via","every","any","across","using","using",
]);

(async function main() {
  const files = (await readdir(RAW_DIR)).filter((f) => f.endsWith(".json"));
  const byCategory = new Map(); // slug → { ios: [...], play: [...] }
  const all = [];

  for (const f of files) {
    const payload = JSON.parse(await readFile(join(RAW_DIR, f), "utf8"));
    const { store, category, apps } = payload;
    if (!byCategory.has(category)) byCategory.set(category, { ios: [], play: [] });
    byCategory.get(category)[store] = apps;
    all.push(...apps);
  }

  const benchmarks = {};
  for (const [slug, { ios, play }] of byCategory.entries()) {
    benchmarks[slug] = computeBenchmarks([...ios, ...play], { ios, play });
  }
  benchmarks._default = computeBenchmarks(all, {
    ios: all.filter((a) => a.source === "ios"),
    play: all.filter((a) => a.source === "play"),
  });

  // Top vocabulary per category (uses the per-category bag of words). Saved
  // alongside the metrics so prompt.ts can suggest category-appropriate
  // language without hardcoding a list.
  for (const [slug, { ios, play }] of byCategory.entries()) {
    benchmarks[slug].topVocabulary = computeTopVocabulary([...ios, ...play]);
  }
  benchmarks._default.topVocabulary = computeTopVocabulary(all);

  // Representative example listings per category. The generator prompt
  // pulls these in as in-context references so the LLM sees the structural
  // patterns top apps use, not just aggregate statistics.
  for (const [slug, { ios, play }] of byCategory.entries()) {
    benchmarks[slug].exampleListings = pickExamples(
      [...ios, ...play],
      benchmarks[slug]
    );
  }
  benchmarks._default.exampleListings = [];

  const out = {
    generatedAt: new Date().toISOString(),
    totalApps: all.length,
    categories: Array.from(byCategory.keys()).sort(),
    benchmarks,
  };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote benchmarks for ${out.categories.length} categories (${all.length} apps) → ${OUT_FILE}`);

  // Print a quick readable summary so the user can sanity-check the
  // numbers without opening the JSON.
  console.log("\n--- Category summary ---");
  for (const slug of out.categories) {
    const b = benchmarks[slug];
    console.log(
      `${slug.padEnd(18)} title p50=${b.titleLength.p50} | full p50=${b.fullDescLength.p50} | rating p50=${b.rating.p50} | bullet=${b.dominantBullet}`
    );
  }
})().catch((err) => {
  console.error("Fatal:", err?.stack || err);
  process.exit(1);
});

// ---------------------------------------------------------------------------

function computeBenchmarks(apps, byStore) {
  const titles = apps.map((a) => (a.title ?? "").trim()).filter(Boolean);
  const shorts = (byStore.play ?? [])
    .map((a) => (a.shortDesc ?? "").trim())
    .filter((s) => s.length >= 15);
  const fulls = apps.map((a) => (a.fullDesc ?? "").trim()).filter((s) => s.length >= 200);
  const hookParas = fulls.map((d) => firstParagraph(d));
  const ratings = apps.map((a) => a.rating).filter((r) => typeof r === "number" && r > 0);
  const ratingCounts = apps.map((a) => a.ratingCount).filter((n) => typeof n === "number" && n > 0);
  const ssCounts = apps
    .map((a) => (Array.isArray(a.screenshotUrls) ? a.screenshotUrls.length : 0))
    .filter((n) => n > 0);
  const updates = apps
    .map((a) => monthsSince(a.lastUpdated))
    .filter((n) => typeof n === "number");

  // Bullet character frequencies, counted only when used as a list bullet
  // (at start of a non-empty line).
  const bulletTotals = Object.fromEntries(BULLET_CHARS.map((c) => [c, 0]));
  let listingsWithBullets = 0;
  for (const d of fulls) {
    let used = false;
    for (const line of d.split("\n")) {
      const m = line.match(/^\s*([•◦●\-*▶◉►→])\s+\S/);
      if (m) {
        bulletTotals[m[1]] += 1;
        used = true;
      }
    }
    if (used) listingsWithBullets++;
  }
  const dominantBullet = Object.entries(bulletTotals)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "•";

  // Section count = paragraph blocks (split on blank lines), excluding very
  // short trailing ones. Gives a feel for how chunked top apps are.
  const sectionCounts = fulls.map((d) => {
    const paras = d.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return paras.length;
  });

  // Opener-pattern share. For each hook paragraph, classify the opening
  // clause as one of the three patterns or "other".
  const openerCounts = { brandLinking: 0, imperative: 0, scenario: 0, question: 0, other: 0 };
  for (let i = 0; i < hookParas.length; i++) {
    const hook = hookParas[i];
    const opener = (hook.split(/[.\n!?]/)[0] ?? "").trim().toLowerCase();
    if (!opener) {
      openerCounts.other++;
      continue;
    }
    const firstWord = opener.split(/\s+/)[0]?.replace(/[^a-z']/g, "") ?? "";
    const startsWithScenario = SCENARIO_OPENERS.some((s) => opener.startsWith(s + " "));
    const startsWithImperative = HOOK_VERB_OPENERS.includes(firstWord);
    const hasLinking = HOOK_LINKING_VERBS.some((v) => new RegExp(`\\b${v}\\b`).test(opener));
    if (/^(tired of|sick of|do you|want to|ever wanted|are you)\b/.test(opener)) {
      openerCounts.question++;
    } else if (startsWithScenario) {
      openerCounts.scenario++;
    } else if (startsWithImperative) {
      openerCounts.imperative++;
    } else if (hasLinking) {
      openerCounts.brandLinking++;
    } else {
      openerCounts.other++;
    }
  }

  // Benefit-lexicon coverage — how many apps in this category use each term
  // anywhere in the title + shortDesc + fullDesc corpus.
  const lexiconHits = {};
  for (const w of BENEFIT_LEXICON) {
    let n = 0;
    for (const a of apps) {
      const corpus = `${a.title ?? ""} ${a.shortDesc ?? ""} ${a.fullDesc ?? ""}`.toLowerCase();
      if (corpus.includes(w)) n++;
    }
    lexiconHits[w] = n;
  }

  // Emoji / exclamation incidence across full descriptions.
  let emojiBodies = 0;
  let exclamationBodies = 0;
  for (const d of fulls) {
    if ((d.match(EMOJI_RE)?.length ?? 0) > 0) emojiBodies++;
    if ((d.match(/!/g)?.length ?? 0) > 0) exclamationBodies++;
  }

  // Short-desc opener verbs (Play only). Counts which verbs the leading word
  // belongs to so we can suggest category-appropriate openers.
  const shortVerbCounts = {};
  for (const s of shorts) {
    const w = s.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, "") ?? "";
    if (HOOK_VERB_OPENERS.includes(w)) {
      shortVerbCounts[w] = (shortVerbCounts[w] ?? 0) + 1;
    }
  }

  return {
    sampleSize: apps.length,
    titleLength: distribution(titles.map((t) => t.length)),
    shortDescLength: shorts.length ? distribution(shorts.map((s) => s.length)) : null,
    fullDescLength: distribution(fulls.map((d) => d.length)),
    hookLength: distribution(hookParas.filter(Boolean).map((h) => h.length)),
    sectionCount: distribution(sectionCounts),
    rating: distribution(ratings),
    ratingCountP50: median(ratingCounts),
    screenshotCount: ssCounts.length ? distribution(ssCounts) : null,
    monthsSinceUpdate: updates.length ? distribution(updates) : null,
    dominantBullet,
    bulletCharFrequency: bulletTotals,
    listingsWithBullets,
    listingsAnalyzed: fulls.length,
    openerPatternShare: openerCounts,
    emojiBodiesShare: fulls.length ? round2(emojiBodies / fulls.length) : 0,
    exclamationBodiesShare: fulls.length ? round2(exclamationBodies / fulls.length) : 0,
    benefitLexiconHits: lexiconHits,
    shortDescOpenerVerbs: shortVerbCounts,
  };
}

function pickExamples(apps, bench) {
  // Select up to 3 listings that exemplify the category's structural
  // patterns. Criteria, in order:
  //   - rating ≥ 4.4 (strong signal of a high-quality listing)
  //   - full description length within the category's p25–p75 band (so
  //     examples reflect the typical body length, not the outliers)
  //   - at least 3 bullet lines (proves the listing uses a structured body)
  //   - both title and full description present
  // If fewer than 3 listings clear all criteria, fall back to top-by-rating
  // among listings that at least have full descriptions.
  const fullBand = bench?.fullDescLength;
  const lo = fullBand ? fullBand.p25 : 1200;
  const hi = fullBand ? fullBand.p75 : 3200;

  const scored = apps
    .filter((a) => a.title && a.fullDesc && a.fullDesc.length >= 400)
    .map((a) => {
      const bulletLines = countBulletLines(a.fullDesc);
      const inBand = a.fullDesc.length >= lo && a.fullDesc.length <= hi;
      const rating = typeof a.rating === "number" ? a.rating : 0;
      // Composite score: rating is the dominant factor, structural quality
      // breaks ties.
      const score =
        rating * 10 +
        (inBand ? 3 : 0) +
        (bulletLines >= 3 ? 2 : 0) +
        Math.min(2, bulletLines * 0.1);
      return { a, score, bulletLines, rating };
    })
    .filter((x) => x.rating >= 4.0)
    .sort((a, b) => b.score - a.score);

  // Prefer one example per store source so the LLM sees both Play and iOS
  // structural conventions. If one store dominates the top of the list,
  // still emit a second from the same store rather than no example.
  const picks = [];
  const seenSources = new Set();
  for (const x of scored) {
    if (picks.length >= 3) break;
    if (seenSources.has(x.a.source) && picks.length < 2) continue;
    picks.push(x.a);
    seenSources.add(x.a.source);
  }
  for (const x of scored) {
    if (picks.length >= 3) break;
    if (picks.find((p) => p.appId === x.a.appId)) continue;
    picks.push(x.a);
  }

  return picks.map((a) => ({
    source: a.source,
    title: a.title,
    shortDesc: a.shortDesc,
    fullDesc: truncateForPrompt(a.fullDesc, 1800),
    rating: a.rating,
    appId: a.appId,
  }));
}

function countBulletLines(text) {
  let n = 0;
  for (const line of text.split("\n")) {
    if (/^\s*[•◦●\-*]\s+\S/.test(line)) n++;
  }
  return n;
}

function truncateForPrompt(text, maxChars) {
  if (text.length <= maxChars) return text;
  // Try to cut on a paragraph boundary so the truncated example still reads
  // as a complete structural unit.
  const slice = text.slice(0, maxChars);
  const lastBlank = slice.lastIndexOf("\n\n");
  if (lastBlank > maxChars * 0.6) return slice.slice(0, lastBlank).trim() + "\n\n[…]";
  return slice.trim() + " […]";
}

function computeTopVocabulary(apps) {
  // Build a bag of words across all full descriptions in the bucket, drop
  // stopwords / very short tokens, return top N. We also surface the top
  // bigrams since two-word concepts ("focus mode", "scan documents") are
  // more category-defining than single tokens.
  const unigrams = new Map();
  const bigrams = new Map();
  for (const a of apps) {
    let text = (a.fullDesc ?? "").toLowerCase();
    if (!text) continue;
    // Strip URLs and the legal/footer boilerplate that swamps real vocabulary
    // — "https://...", "privacy policy", "terms of service", and lone "com".
    text = text
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/www\.\S+/g, " ")
      .replace(/\bprivacy\s+policy\b/g, " ")
      .replace(/\bterms\s+of\s+(?:service|use)\b/g, " ");
    const tokens = text
      .replace(/[^a-z0-9'\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w && w !== "com" && w !== "www" && w !== "https" && w !== "http");
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i];
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      unigrams.set(w, (unigrams.get(w) ?? 0) + 1);
      if (i + 1 < tokens.length) {
        const next = tokens[i + 1];
        if (next.length >= 3 && !STOP_WORDS.has(next)) {
          const bg = `${w} ${next}`;
          bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
        }
      }
    }
  }

  return {
    unigrams: topN(unigrams, 25),
    bigrams: topN(bigrams, 15),
  };
}

function topN(map, n) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

function distribution(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0],
    p25: pickPercentile(sorted, 0.25),
    p50: pickPercentile(sorted, 0.5),
    p75: pickPercentile(sorted, 0.75),
    p90: pickPercentile(sorted, 0.9),
    max: sorted[sorted.length - 1],
    mean: round2(sorted.reduce((a, b) => a + b, 0) / sorted.length),
  };
}

function pickPercentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  const v = sorted[idx];
  return Number.isInteger(v) ? v : round2(v);
}

function median(values) {
  if (!values?.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return pickPercentile(sorted, 0.5);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function firstParagraph(text) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paras[0] ?? "";
}

function monthsSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / (86_400_000 * 30)));
}
