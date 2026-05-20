import { KeywordResult } from "./types";

// Keyword extraction tuned for app-store listing copy. Two entry points:
//
//   extractKeywords(text)        — backward-compatible flat-text input
//   extractKeywords({ ... })     — structured Corpus with per-section weights
//
// Internally both run the same pipeline. The structured form is much more
// accurate because title hits weigh 5×, subtitle/short-desc 3×, and body 1×
// — matching the store ranking signals.

const STOPWORDS = new Set([
  // Articles, pronouns, prepositions, basic verbs
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
  "be", "has", "had", "have", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "not", "no", "nor", "so", "if",
  "then", "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "as", "because", "been", "before", "being", "below",
  "between", "both", "during", "each", "few", "he", "her",
  "here", "him", "his", "how", "i", "into", "its", "let", "lets", "me", "more",
  "most", "my", "now", "only", "other", "our", "out", "own", "re",
  "s", "same", "she", "some", "such", "t", "their", "them", "there",
  "these", "they", "through", "under", "up", "us", "we", "what", "when",
  "where", "which", "while", "who", "whom", "why", "you", "your",
  "don", "doesn", "didn", "won", "wouldn", "couldn", "shouldn",
  // URL / protocol fragments that leak in when URLs aren't fully stripped.
  "https", "http", "www", "com", "org", "net", "io",
  // ASO-specific noise — generic enough to appear in any listing without
  // carrying real search intent. Adding these dramatically improves the
  // signal-to-noise ratio on detected primary keywords.
  "app", "apps", "use", "used", "using", "uses",
  "make", "makes", "made", "making",
  "get", "gets", "got", "getting",
  "find", "finds", "found", "finding",
  "want", "wants", "wanted", "wanting",
  "need", "needs", "needed", "needing",
  "feel", "feels", "felt",
  "best", "free", "easy", "easier", "easiest",
  "great", "good", "better", "amazing", "fantastic", "awesome",
  "fast", "faster", "fastest", "quick", "quickly",
  "new", "today", "every", "everyone", "anyone", "someone",
  "always", "never", "ever", "way", "ways",
  "much", "many", "lot", "lots",
  "thing", "things", "stuff",
  "one", "two", "three", "first", "last",
  "love", "loved",
  "really", "well", "yes", "yeah",
  "say", "says", "said",
  "available", "powered", "designed", "built",
]);

interface Corpus {
  title?: string;
  subtitle?: string;
  shortDesc?: string;
  fullDesc?: string;
  // Optional brand/developer name. Brand tokens are excluded from keyword
  // candidates since they represent brand identity, not search intent.
  brand?: string;
}

// Slot weights mirror how heavily each section is indexed on Google Play and
// Apple App Store. Title and short description are the most heavily indexed;
// body / full description is huge but each token there counts for less.
const SECTION_WEIGHTS = {
  title: 5,
  subtitle: 3,
  shortDesc: 3,
  fullDesc: 1,
} as const;

// Boost factors so multi-word phrases outrank their unigram components when
// they exist. Search queries are almost always multi-word, so phrases carry
// far more intent than individual words.
const BIGRAM_BOOST = 1.6;
const TRIGRAM_BOOST = 2.2;

// Splits text into sentence-shaped chunks before tokenising. Bigrams /
// trigrams shouldn't form across sentence boundaries — "tracker. Plan your"
// would otherwise yield a spurious "tracker plan" bigram.
const SENTENCE_BOUNDARY = /[.!?;:\n•]+/;

function tokenizeSentences(text: string): string[][] {
  return text
    .replace(/https?:\/\/[^\s)]+/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9.!?;:\n•\s-]/g, " ")
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.split(/\s+/).filter(Boolean))
    .filter((sentence) => sentence.length > 0);
}

function brandTokenSet(brand: string | undefined): Set<string> {
  if (!brand) return new Set();
  return new Set(
    brand
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2)
  );
}

function isUsableToken(token: string, brandTokens: Set<string>): boolean {
  if (token.length < 2) return false;
  if (STOPWORDS.has(token)) return false;
  if (brandTokens.has(token)) return false;
  return true;
}

function processSection(
  text: string,
  weight: number,
  brandTokens: Set<string>,
  uni: Map<string, number>,
  bi: Map<string, number>,
  tri: Map<string, number>
) {
  for (const tokens of tokenizeSentences(text)) {
    for (const w of tokens) {
      if (!isUsableToken(w, brandTokens)) continue;
      uni.set(w, (uni.get(w) ?? 0) + weight);
    }
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      if (!isUsableToken(a, brandTokens) || !isUsableToken(b, brandTokens)) continue;
      const phrase = `${a} ${b}`;
      bi.set(phrase, (bi.get(phrase) ?? 0) + weight);
    }
    for (let i = 0; i < tokens.length - 2; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      const c = tokens[i + 2];
      if (
        !isUsableToken(a, brandTokens) ||
        !isUsableToken(b, brandTokens) ||
        !isUsableToken(c, brandTokens)
      ) {
        continue;
      }
      const phrase = `${a} ${b} ${c}`;
      tri.set(phrase, (tri.get(phrase) ?? 0) + weight);
    }
  }
}

export function extractKeywords(input: string | Corpus): KeywordResult[] {
  const corpus: Corpus = typeof input === "string" ? { fullDesc: input } : input;
  const brandTokens = brandTokenSet(corpus.brand);

  const uni = new Map<string, number>();
  const bi = new Map<string, number>();
  const tri = new Map<string, number>();

  if (corpus.title) processSection(corpus.title, SECTION_WEIGHTS.title, brandTokens, uni, bi, tri);
  if (corpus.subtitle)
    processSection(corpus.subtitle, SECTION_WEIGHTS.subtitle, brandTokens, uni, bi, tri);
  if (corpus.shortDesc)
    processSection(corpus.shortDesc, SECTION_WEIGHTS.shortDesc, brandTokens, uni, bi, tri);
  if (corpus.fullDesc)
    processSection(corpus.fullDesc, SECTION_WEIGHTS.fullDesc, brandTokens, uni, bi, tri);

  // Subsume: each occurrence of a trigram already counts toward two of its
  // bigrams and three of its unigrams. Subtract so the merged ranking doesn't
  // double-count. Without this, "habit tracker app" appearing 5 times would
  // inflate "habit", "tracker", "habit tracker", and "tracker app" all to 5+.
  for (const [phrase, count] of tri.entries()) {
    const [a, b, c] = phrase.split(" ");
    decay(bi, `${a} ${b}`, count);
    decay(bi, `${b} ${c}`, count);
    decay(uni, a, count);
    decay(uni, b, count);
    decay(uni, c, count);
  }
  for (const [phrase, count] of bi.entries()) {
    const [a, b] = phrase.split(" ");
    decay(uni, a, count);
    decay(uni, b, count);
  }

  // Build the merged candidate list, applying phrase boosts.
  const merged: KeywordResult[] = [];
  for (const [word, count] of uni.entries()) {
    if (count > 0) merged.push({ word, count: Math.round(count) });
  }
  for (const [word, count] of bi.entries()) {
    if (count > 0) merged.push({ word, count: Math.round(count * BIGRAM_BOOST) });
  }
  for (const [word, count] of tri.entries()) {
    if (count > 0) merged.push({ word, count: Math.round(count * TRIGRAM_BOOST) });
  }

  return merged
    .sort((a, b) => b.count - a.count || a.word.length - b.word.length)
    .slice(0, 10);
}

function decay(map: Map<string, number>, key: string, amount: number) {
  const cur = map.get(key);
  if (cur === undefined) return;
  const next = cur - amount;
  if (next > 0) map.set(key, next);
  else map.delete(key);
}
