import { ScoreResult, ScoreCheck } from "./types";
import {
  getBenchmarks,
  comfortableRange,
  type CategoryBenchmarks,
  type Distribution,
} from "./benchmarks";
import { ASO } from "./aso-standards";

// ASO scorer.
//
// When a scraped listing is available, score against real signals using
// category-specific standards (a productivity app's title plays by different
// length norms than a finance app's). When only the URL is known, fall back
// to a URL-only heuristic so the marketing /score teaser keeps working
// before the user signs in for the live audit.
//
// User-facing check notes describe the standard the listing should meet —
// they do not reveal the methodology behind the score.

export interface ScoreListing {
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
  // Ranking-signal fields populated by the scraper. Optional — checks that
  // depend on them only run when the data is actually present, so the total
  // weight reflects only what we can measure.
  rating?: number;
  ratingCount?: number;
  screenshotUrls?: string[];
  lastUpdated?: string;
  source?: "play" | "ios";
  // Category genre returned by the scraper (e.g. "Productivity",
  // "Health & Fitness"). Used to pick category-specific thresholds; if absent
  // or unrecognised, falls back to a cross-category default.
  genre?: string;
}

export function calculateScore(
  url: string,
  listing?: ScoreListing | null,
  llmKeyword?: { primary: string; secondary?: string } | null,
): ScoreResult {
  const hasListing =
    !!listing && (!!listing.title || !!listing.shortDesc || !!listing.subtitle || !!listing.fullDesc);
  if (hasListing) return scoreListing(listing!, llmKeyword);
  return scoreUrlOnly(url);
}

// ---- Listing-based scoring ------------------------------------------------

const BENEFIT_LEXICON = [
  "privacy", "private", "secure", "encryption", "encrypted",
  "free",
  "easy", "easily", "simple", "quick", "fast",
  "share", "shared",
  "anywhere", "offline", "sync",
  "help", "built-in", "automatic", "automatically",
  "one place",
];

const HOOK_VERB_OPENERS = [
  "use", "browse", "learn", "explore", "get", "start", "stay", "make",
  "create", "discover", "join", "listen", "watch", "send", "track", "manage",
  "find", "save", "share", "build", "connect", "store", "back up",
  "chat", "open", "edit", "scan", "plan", "play", "read", "design", "shop",
  "navigate", "organize", "record", "capture", "stream", "search", "book",
  "order", "control", "protect", "secure", "sync", "access", "download",
  "upload", "convert", "customize", "monitor", "schedule", "automate",
  "simplify", "try", "take", "keep", "set", "turn", "run", "choose",
];

const HOOK_LINKING_VERBS = ["is", "lets", "helps", "brings", "gives", "puts", "makes"];

const SCENARIO_OPENERS = ["whether", "looking for", "ready to", "from", "with"];

const FORBIDDEN_QUESTION_OPENERS = ["tired of", "sick of", "want to", "do you", "ever wanted"];

const FORBIDDEN_CTA_PHRASES = [
  "download now", "download the app", "get started today",
  "get it now", "available on google play", "available on the app store",
  "click below", "click here", "tap below",
];

// Short-description openers that waste the indexed first 30 characters on
// filler — these are the patterns Google Play ranking research flags as
// "burned ad space" because the model isn't seeing functional keywords yet
// at the moment of highest indexing weight.
const FORBIDDEN_SHORT_DESC_OPENERS = [
  "welcome to", "introducing", "discover the", "discover a",
  "the new", "the all-new", "the all new", "the best",
  "looking for an app", "looking for the", "are you looking",
  "meet ", "say hello to", "presenting",
];

// Title separators that signal a clean "Brand + Descriptor" structure rather
// than a comma-stuffed keyword list. Per Google Play indexing weighting, the
// optimal title pairs a unique brand with a generic functional descriptor.
const TITLE_BRAND_SEPARATORS = [":", " - ", " – ", " — ", " | "];

// Bullets accepted as a clean list character. Per-category benchmarks tell
// us which one this category prefers; the scorer rewards consistency, not
// any specific character.
const ACCEPTABLE_BULLETS = ["•", "◦", "●", "-", "*", "✓", "✔", "☑", "✦", "➤", "➜", "►", "→", "★", "✧"];
const POOR_BULLET_CHARS = ["▶", "◉"];

function scoreListing(
  listing: ScoreListing,
  llmKeyword?: { primary: string; secondary?: string } | null,
): ScoreResult {
  const { data: bench } = getBenchmarks(listing.genre);

  const title = (listing.title ?? "").trim();
  const shortDesc = (listing.shortDesc ?? listing.subtitle ?? "").trim();
  const fullDesc = (listing.fullDesc ?? "").trim();
  const paragraphs = splitIntoBlocks(fullDesc);
  const hookPara = extractHook(paragraphs[0] ?? "");
  const closingPara = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : "";
  const allCheckedText = `${title} ${shortDesc} ${fullDesc}`.toLowerCase();
  const fullLower = fullDesc.toLowerCase();
  const hookLower = hookPara.toLowerCase();
  const closingLower = closingPara.toLowerCase();
  const brandToken = title.split(/[\s:–—-]+/)[0]?.toLowerCase() ?? "";

  // Category-derived bands. comfortableRange returns p25/p75 as the "in-band"
  // range and p90 as the upper guardrail. When benchmarks are missing,
  // fall back to conservative defaults.
  const titleBand = comfortableRange(bench?.titleLength) ?? { low: 12, high: 28, median: 18, ceiling: 30 };
  const shortBand = comfortableRange(bench?.shortDescLength) ?? { low: 50, high: 80, median: 70, ceiling: 80 };
  const fullBand = comfortableRange(bench?.fullDescLength) ?? { low: ASO.FULL_DESC_FLOOR, high: 3200, median: 2400, ceiling: ASO.FULL_DESC_CEILING };
  const hookBand = comfortableRange(bench?.hookLength) ?? { low: 120, high: 320, median: 220, ceiling: 400 };
  const sectionBand = comfortableRange(bench?.sectionCount) ?? { low: 5, high: 12, median: 8, ceiling: 16 };

  // ---- Bullets --------------------------------------------------------
  const bulletLines = fullDesc.split("\n");
  const bulletCharCounts: Record<string, number> = {};
  for (const line of bulletLines) {
    const m = line.match(/^\s*([•◦●\-*✓✔☑✦➤➜►→★✧▶◉])\s+\S/);
    if (m) {
      const ch = m[1];
      bulletCharCounts[ch] = (bulletCharCounts[ch] ?? 0) + 1;
    }
  }
  const acceptableBulletTotal = ACCEPTABLE_BULLETS.reduce(
    (s, ch) => s + (bulletCharCounts[ch] ?? 0),
    0
  );
  const poorBulletTotal = POOR_BULLET_CHARS.reduce(
    (s, ch) => s + (bulletCharCounts[ch] ?? 0),
    0
  );
  const hasBullets = acceptableBulletTotal + poorBulletTotal >= 3;
  let dominantBullet: string | undefined;
  let dominantCount = 0;
  for (const [ch, n] of Object.entries(bulletCharCounts)) {
    if (n > dominantCount) {
      dominantCount = n;
      dominantBullet = ch;
    }
  }

  // ---- Sections (labelled chunks) ------------------------------------
  const sectionLabelMatches = paragraphs.filter((p) => {
    const firstLine = p.split("\n")[0].trim();
    if (firstLine.length === 0 || firstLine.length > 80) return false;
    if (firstLine.endsWith(".") || firstLine.endsWith("!")) return false;
    if (!/^[A-Z]/.test(firstLine)) return false;
    return p.split("\n").length > 1 || firstLine.endsWith(":");
  });
  const sectionCount = Math.max(sectionLabelMatches.length, paragraphs.length);

  // ---- Sentences per paragraph --------------------------------------
  const sentenceCounts = paragraphs.map((p) => sentenceCount(p));
  const longParagraphs = sentenceCounts.filter((n) => n > 4).length;

  // ---- Benefit lexicon coverage --------------------------------------
  const benefitHits = BENEFIT_LEXICON.filter((w) => allCheckedText.includes(w)).length;

  // ---- Brand repetition ---------------------------------------------
  const brandMentions = brandToken && brandToken.length >= 3
    ? (fullLower.match(new RegExp(`\\b${escapeRegex(brandToken)}\\b`, "g"))?.length ?? 0)
    : 0;

  // ---- Emoji counts -------------------------------------------------
  const emojiMatches = fullDesc.match(EMOJI_RE) ?? [];
  const emojiCount = emojiMatches.length;

  // ---- Build checks --------------------------------------------------
  const checks: ScoreCheck[] = [];

  // 1. Title length within range (weight 3)
  const titleLengthOk =
    title.length >= Math.max(8, titleBand.low - 4) &&
    title.length <= ASO.TITLE_MAX;
  checks.push(makeCheck({
    label: "Title length within range",
    weight: 3,
    passed: titleLengthOk,
    okNote: `Title is ${title.length} chars — within the 30-char store cap.`,
    failNote: title.length === 0
      ? "No title detected on the listing."
      : title.length < Math.max(8, titleBand.low - 4)
        ? `Title is only ${title.length} chars. Aim for ${titleBand.low}–${titleBand.high} characters — that's the room you have to add a short descriptor after the brand.`
        : `Title exceeds the 30-char store cap.`,
  }));

  // 2. Title format (no comma keyword-stuffing) (weight 3)
  // A single comma after a brand separator is fine ("YouTube: Watch, Listen, Stream").
  // Flag only when there are 3+ commas (keyword lists) or 6+ trailing words without a separator.
  const titleHasSeparator = TITLE_BRAND_SEPARATORS.some((sep) => title.includes(sep));
  const commaCount = (title.match(/,/g) ?? []).length;
  const titleStuffed = commaCount >= 3 || (!titleHasSeparator && /\s\w+\s\w+\s\w+\s\w+\s\w+\s\w+$/.test(title));
  checks.push(makeCheck({
    label: "Title format is clean",
    weight: 3,
    passed: !titleStuffed,
    okNote: "Title reads as a brand plus a short descriptor, not a comma-separated keyword list.",
    failNote: commaCount >= 3
      ? "Title has multiple commas — reads as a keyword list. Use `Brand: Descriptor` instead of comma-chaining keywords."
      : "Title looks keyword-stuffed. Use `Brand: Descriptor` or `Brand - Descriptor` instead of chaining keywords.",
  }));

  // 2b. Title carries a functional descriptor after the brand (weight 3).
  const titleHasDescriptor =
    titleHasSeparator &&
    title.split(/[:|\-–—]/).slice(1).join(" ").trim().split(/\s+/).filter(Boolean).length >= 1;
  const titleLongEnoughForDescriptor = title.length >= 14;
  checks.push(makeCheck({
    label: "Title pairs brand with a descriptor",
    weight: 3,
    passed: titleHasDescriptor || !titleLongEnoughForDescriptor,
    okNote: titleHasDescriptor
      ? "Title pairs the brand with a functional descriptor — captures both branded and non-branded search intent."
      : "Title is short enough that a bare brand reads cleanly.",
    failNote:
      "Title is brand-only. Append a short functional descriptor after a `:` or ` - ` (e.g. `Brand: Calorie Tracker`) to capture non-branded search traffic.",
  }));

  if (shortDesc.length > 0) {
    // 3. Short description length (weight 4)
    const shortOk = shortDesc.length >= Math.max(ASO.SHORT_DESC_MIN, shortBand.low) && shortDesc.length <= ASO.SHORT_DESC_MAX;
    checks.push(makeCheck({
      label: "Short description uses available space",
      weight: 4,
      passed: shortOk,
      okNote: shortDesc.length >= shortBand.high
        ? `Short description is ${shortDesc.length} chars — uses the available space well.`
        : `Short description is ${shortDesc.length} chars — fits the 80-char limit; a tight short line works when the brand carries weight.`,
      failNote: shortDesc.length < Math.max(ASO.SHORT_DESC_MIN, shortBand.low)
        ? `Short description is only ${shortDesc.length} chars — too sparse. Aim for ${shortBand.low}–${shortBand.high} characters to use the available space.`
        : `Short description is ${shortDesc.length} chars — exceeds the ${ASO.SHORT_DESC_MAX}-char store cap.`,
    }));

    // 4. Short description verb-lead or sentence-fragment (weight 2)
    const firstWord = (shortDesc.split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z']/g, "");
    const verbLed = HOOK_VERB_OPENERS.includes(firstWord);
    const shortDescIsSubstantive = shortDesc.length >= 30 && /[a-z]/i.test(shortDesc);
    checks.push(makeCheck({
      label: "Short description leads with action",
      weight: 2,
      passed: verbLed || shortDescIsSubstantive,
      okNote: verbLed
        ? "Short description leads with an action verb — the strongest opener pattern for this field."
        : "Short description reads as a clear, substantive product statement.",
      failNote: "Short description doesn't lead with an action verb. Try opening with 'Make', 'Stay', 'Create', 'Get', or similar.",
    }));

    // 4b. Short description avoids filler openers (weight 3).
    // Google Play indexes the first 30 characters most heavily; burning them
    // on phrases like "Welcome to" or "Introducing" leaves functional
    // keywords out of the highest-weighted slot of the field.
    const shortDescOpener = shortDesc.toLowerCase().slice(0, 40);
    const hasFillerOpener = FORBIDDEN_SHORT_DESC_OPENERS.some((p) =>
      shortDescOpener.startsWith(p)
    );
    checks.push(makeCheck({
      label: "Short description opens with substance",
      weight: 3,
      passed: !hasFillerOpener,
      okNote: "Short description doesn't burn its first 30 characters on filler — functional keywords appear in the indexed slot.",
      failNote:
        "Short description opens with filler ('Welcome to…', 'Introducing…', 'Discover the…', 'The new…'). The first 30 characters are the most heavily indexed; lead with what the app does.",
    }));
  }

  // 5. Full description length (weight 4)
  const fullOk = fullDesc.length >= Math.max(ASO.FULL_DESC_FLOOR, fullBand.low - 200) && fullDesc.length <= ASO.FULL_DESC_CEILING;
  checks.push(makeCheck({
    label: "Full description hits target length",
    weight: 4,
    passed: fullOk,
    okNote: fullDesc.length >= fullBand.median
      ? `Full description is ${fullDesc.length} chars — sits in the comfortable range for this category.`
      : `Full description is ${fullDesc.length} chars — short but within range; a tight body works when the structure stays clean.`,
    failNote: fullDesc.length === 0
      ? "No full description detected."
      : fullDesc.length < Math.max(ASO.FULL_DESC_FLOOR, fullBand.low)
        ? `Full description is only ${fullDesc.length} chars. Aim for ${fullBand.low}–${fullBand.high} characters to give the body room to breathe.`
        : `Full description is ${fullDesc.length} chars — over the ${ASO.FULL_DESC_CEILING}-char ceiling. Trim toward ${fullBand.median} characters; padding hurts more than it helps.`,
  }));

  // 6. Hook (first paragraph) length (weight 4)
  const hookOk = hookPara.length >= Math.max(80, hookBand.low - 30) && hookPara.length <= Math.min(500, hookBand.ceiling + 50);
  checks.push(makeCheck({
    label: "Hook paragraph length",
    weight: 4,
    passed: hookOk,
    okNote: `Hook is ${hookPara.length} chars — sits in the ${hookBand.low}–${hookBand.high} band where opening paragraphs read tightest.`,
    failNote: hookPara.length === 0
      ? "No hook paragraph detected."
      : hookPara.length < Math.max(80, hookBand.low - 30)
        ? `Hook is only ${hookPara.length} chars. Aim for ~${hookBand.median} with one positioning sentence and one capability sentence.`
        : `Hook is ${hookPara.length} chars — too long for an opener. Trim toward ${hookBand.median}; everything else belongs in the body sections.`,
  }));

  // 7. Brand in hook (weight 4)
  const brandInHook = brandToken.length >= 3 && hookLower.includes(brandToken);
  checks.push(makeCheck({
    label: "Hook anchors the brand name",
    weight: 4,
    passed: brandInHook,
    okNote: "Hook names the brand in the first sentence — the dominant opener pattern.",
    failNote: "Hook never mentions the brand name. Open with `[Brand] is/lets/helps…` so the first thing readers see is the product name.",
  }));

  // 8. Hook opener pattern (weight 3)
  const hookOpener = hookPara.split(/[.\n!?]/)[0]?.trim() ?? "";
  const hookOpenerLower = hookOpener.toLowerCase();
  const hookHasLinking = HOOK_LINKING_VERBS.some((v) =>
    new RegExp(`\\b${v}\\b`).test(hookOpenerLower)
  );
  const hookHasImperative = HOOK_VERB_OPENERS.some((v) =>
    new RegExp(`^${escapeRegex(v)}\\b`).test(hookOpenerLower)
  );
  const hookHasScenario = SCENARIO_OPENERS.some((s) =>
    new RegExp(`^${escapeRegex(s)}\\b`).test(hookOpenerLower)
  );
  const goodOpener = hookHasLinking || hookHasImperative || hookHasScenario;
  const badQuestion = FORBIDDEN_QUESTION_OPENERS.some((q) => hookOpenerLower.startsWith(q));
  checks.push(makeCheck({
    label: "Hook uses a proven opener pattern",
    weight: 3,
    passed: goodOpener && !badQuestion,
    okNote: "Hook opens with a strong positioning pattern — either '[Brand] is/lets/helps…', an imperative verb, or a scenario.",
    failNote: badQuestion
      ? "Hook opens with a pain-question ('Tired of…?'). Switch to a positioning sentence — the brand and outcome should land first."
      : "Hook opener could be tighter. Try '[Brand] is…', 'Use/Get/Explore [Brand]…', or 'Whether you're…'.",
  }));

  // 9. Bullet character quality (weight 5)
  const usesAcceptableBullet = hasBullets && acceptableBulletTotal >= poorBulletTotal;
  const longBodyNeedsBullets = fullDesc.length >= 1500;
  checks.push(makeCheck({
    label: "Uses a consistent bullet character",
    weight: 5,
    passed: hasBullets ? usesAcceptableBullet : !longBodyNeedsBullets,
    okNote: dominantBullet
      ? `Bullets use "${dominantBullet}" consistently — a clean, scannable list character.`
      : "Body is concise enough that no bullets are needed.",
    failNote: hasBullets
      ? `Bullets use ${POOR_BULLET_CHARS.filter((c) => bulletCharCounts[c]).join("/") || "non-standard characters"}. Switch to • or a plain dash for cleaner scanning.`
      : `No bullet list detected in a ${fullDesc.length}-char body. Split features into bullets to make the body scannable.`,
  }));

  // 10. Section structure (weight 5)
  const hookEndsWithColon = /:\s*$/.test(hookPara);
  const implicitGooglePattern = hookEndsWithColon && hasBullets;
  const sectionsOk =
    (sectionLabelMatches.length >= 2 && hasBullets) ||
    (sectionLabelMatches.length >= 1 && hasBullets && implicitGooglePattern) ||
    implicitGooglePattern;
  checks.push(makeCheck({
    label: "Body is split into scannable sections",
    weight: 5,
    passed: sectionsOk,
    okNote: implicitGooglePattern && sectionLabelMatches.length < 2
      ? "Hook leads into a bullet list — a clean scannable structure."
      : `${sectionLabelMatches.length} labelled sections detected — the body reads as scannable chunks.`,
    failNote: !hasBullets
      ? "Body lacks bullets or labelled sections. Chunk into 3–7 sections, each as 'Capability label' plus 3–5 bullets — or open with a hook ending in ':' followed by a bullet list."
      : "Bullets exist but aren't anchored to section labels. Add a short Title-Case label above each bullet group, or end the hook with ':' so the bullets read as one section.",
  }));

  // 11. Paragraph length discipline (weight 4)
  checks.push(makeCheck({
    label: "Paragraphs stay short",
    weight: 4,
    passed: paragraphs.length > 0 && longParagraphs <= 1,
    okNote: "Paragraphs stay ≤4 sentences — keeps the body scannable.",
    failNote: `${longParagraphs} paragraph(s) run >4 sentences. Split long thoughts into bullets so readers can scan the body.`,
  }));

  // 12. Section count (weight 2)
  const sectionMin = Math.max(ASO.SECTION_MIN, sectionBand.low - 2);
  const sectionMax = Math.min(ASO.SECTION_MAX, sectionBand.ceiling + 4);
  checks.push(makeCheck({
    label: "Section count is balanced",
    weight: 2,
    passed: sectionCount >= sectionMin && sectionCount <= sectionMax,
    okNote: `${sectionCount} paragraph blocks — sits in the comfortable range for scanning.`,
    failNote: sectionCount < sectionMin
      ? `Only ${sectionCount} sections. Aim for ${sectionBand.low}–${sectionBand.high} labelled blocks.`
      : `${sectionCount} sections is fragmented. Consolidate toward ${sectionBand.median} for cleaner scanning.`,
  }));

  // 13. Benefit keyword coverage (weight 3)
  checks.push(makeCheck({
    label: "Hits core benefit keywords",
    weight: 3,
    passed: benefitHits >= ASO.BENEFIT_HITS_MIN,
    okNote: `Covers ${benefitHits} core benefit terms — strong signal coverage.`,
    failNote: `Only ${benefitHits} benefit term(s) detected. Work in at least three of: privacy/secure, free, easy/simple, share, anywhere/offline.`,
  }));

  // 14. No store-CTA in closing (weight 2)
  const closingHasBadCta = FORBIDDEN_CTA_PHRASES.some((p) => closingLower.includes(p));
  checks.push(makeCheck({
    label: "Closing avoids store-CTA clichés",
    weight: 2,
    passed: !closingHasBadCta,
    okNote: "Closing avoids 'Download now' clichés — finishes with a sub-CTA or sign-off.",
    failNote: "Closing falls back to a 'Download now'-style CTA. Replace with a sub-CTA ('Try [Brand] free') or a short sign-off.",
  }));

  // 15. Emoji discipline (weight 2)
  checks.push(makeCheck({
    label: "Emoji usage is restrained",
    weight: 2,
    passed: emojiCount <= ASO.EMOJI_MAX,
    okNote: emojiCount === 0
      ? "No emoji in the body — clean and professional."
      : `${emojiCount} emoji used — restrained.`,
    failNote: `${emojiCount} emoji detected. Trim to two or fewer; emoji-heavy bodies hurt credibility.`,
  }));

  // 16. Exclamation discipline (weight 2)
  const exclamationCount = (fullDesc.match(/!/g)?.length ?? 0);
  checks.push(makeCheck({
    label: "Exclamation marks stay restrained",
    weight: 2,
    passed: exclamationCount <= ASO.EXCLAMATION_MAX,
    okNote: `${exclamationCount} exclamation mark(s) — within a restrained tone.`,
    failNote: `${exclamationCount} exclamation marks detected. Trim toward two or fewer to lower the hype tone.`,
  }));

  // 17. Brand repetition across body (weight 2)
  const brandCeiling = ASO.BRAND_MENTIONS_MAX;
  checks.push(makeCheck({
    label: "Brand name repeats across body",
    weight: 2,
    passed: brandMentions >= ASO.BRAND_MENTIONS_MIN && brandMentions <= brandCeiling,
    okNote: `Brand name appears ${brandMentions}× across the body — well-anchored.`,
    failNote: brandToken.length < 3
      ? "Couldn't infer brand name from title."
      : brandMentions < ASO.BRAND_MENTIONS_MIN
        ? `Brand mentioned only ${brandMentions}×. Repeat the brand ${ASO.BRAND_MENTIONS_MIN}–${ASO.BRAND_MENTIONS_MAX} times across the body — heavy anchoring keeps the product name in mind.`
        : `Brand repeated ${brandMentions}× — too dense. Trim so it doesn't read as stuffing.`,
  }));

  // ---- Ranking-signal checks ----------------------------------------

  const primaryKwLower = llmKeyword?.primary?.toLowerCase().trim() ?? "";
  const primaryKw = primaryKwLower
    ? { word: primaryKwLower, count: 0 }
    : null;

  // 18. Primary keyword in title (weight 5)
  if (primaryKwLower && primaryKwLower !== brandToken && primaryKw) {
    const inTitle = keywordPresent(primaryKwLower, title);
    checks.push(makeCheck({
      label: "Primary keyword appears in title",
      weight: 5,
      passed: inTitle,
      okNote: `Primary keyword "${primaryKw.word}" is in the title — the heaviest-indexed field in store search.`,
      failNote: `Primary keyword "${primaryKw.word}" doesn't appear in the title. Add it as a short descriptor (e.g. "${brandToken ? brandToken[0].toUpperCase() + brandToken.slice(1) : "Brand"}: ${primaryKw.word.charAt(0).toUpperCase() + primaryKw.word.slice(1)}") — title indexing carries the most ranking weight.`,
    }));

    if (inTitle) {
      const titleLowerStr = title.toLowerCase();
      const kwWords = primaryKwLower.split(/\s+/);
      const firstWordPos = titleLowerStr.search(new RegExp(`\\b${escapeRegex(kwWords[0])}\\b`));
      const titleMidpoint = title.length / 2;
      const frontLoaded = firstWordPos >= 0 && firstWordPos <= titleMidpoint;
      checks.push(makeCheck({
        label: "Primary keyword is front-loaded in title",
        weight: 4,
        passed: frontLoaded,
        okNote: `"${primaryKw.word}" sits in the first half of the title — front position carries higher indexing weight.`,
        failNote: `"${primaryKw.word}" appears late in the title. Move it forward — Play weighs early-title keywords more heavily.`,
      }));
    }
  }

  // 19. Primary keyword in short description (weight 4)
  if (shortDesc.length > 0 && primaryKwLower && primaryKwLower !== brandToken && primaryKw) {
    const inShort = keywordPresent(primaryKwLower, shortDesc);
    checks.push(makeCheck({
      label: "Primary keyword appears in short description",
      weight: 4,
      passed: inShort,
      okNote: `Primary keyword "${primaryKw.word}" is in the short description — Google Play indexes this field for ranking.`,
      failNote: `Primary keyword "${primaryKw.word}" is missing from the short description. The 80-char short description is indexed by Play; work the keyword in naturally.`,
    }));

    if (inShort) {
      const firstSentence =
        (shortDesc.split(/[.!?](?:\s|$)/)[0] ?? "");
      const inFirstSentence = keywordPresent(primaryKwLower, firstSentence);
      checks.push(makeCheck({
        label: "Primary keyword sits in the opening sentence",
        weight: 4,
        passed: inFirstSentence,
        okNote: `"${primaryKw.word}" appears in the opening sentence of the short description — Play prioritises this position when indexing.`,
        failNote: `"${primaryKw.word}" is in the short description but not in the opening sentence. Rewrite so the primary keyword lands in the first sentence — that slot carries the heaviest indexing weight.`,
      }));
    }
  }

  // 20a. Primary keyword in the HOOK of the full description (weight 4).
  if (fullDesc.length > 0 && primaryKwLower && primaryKwLower !== brandToken && primaryKw) {
    const inHook = keywordPresent(primaryKwLower, hookPara);
    checks.push(makeCheck({
      label: "Primary keyword anchors the hook paragraph",
      weight: 4,
      passed: inHook,
      okNote: `"${primaryKw.word}" appears in the hook — the opening paragraph is the most heavily indexed body slot.`,
      failNote: `"${primaryKw.word}" is missing from the hook paragraph. Work it into the first sentences — Play's search crawler weighs hook-paragraph keywords more than body mentions.`,
    }));
  }

  // 20b. No keyword stuffing (weight 4).
  // Per Google Play's NLP-based relevance evaluation, any content word
  // exceeding ~2.5% density across the corpus signals unnatural keyword
  // stuffing and invokes severe algorithmic suppression. Top-ranked
  // listings sit closer to 0.5–1% per term. We scan all content words and
  // penalise the most-repeated one if it crosses the threshold.
  if (fullDesc.length > 400) {
    const STOPWORDS = new Set([
      "the", "and", "for", "with", "you", "your", "from", "that", "this",
      "are", "all", "can", "any", "our", "one", "two", "out", "use", "get",
      "has", "have", "but", "not", "now", "more", "into", "just", "like",
      "what", "when", "will", "they", "their", "them", "there", "than",
      "then", "also", "been", "over",
    ]);
    const words = fullDesc.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    const counts: Record<string, number> = {};
    for (const w of words) {
      if (STOPWORDS.has(w)) continue;
      counts[w] = (counts[w] ?? 0) + 1;
    }
    const total = words.length;
    let topTerm = "";
    let topCount = 0;
    for (const [w, c] of Object.entries(counts)) {
      if (w === brandToken) continue;
      if (brandToken.length >= 3 && (w.startsWith(brandToken) || brandToken.startsWith(w))) continue;
      if (c > topCount) {
        topTerm = w;
        topCount = c;
      }
    }
    const density = total > 0 ? topCount / total : 0;
    const stuffed = density > ASO.KEYWORD_DENSITY_CEILING && topCount >= ASO.KEYWORD_STUFFING_MIN_COUNT;
    checks.push(makeCheck({
      label: "Keyword density stays natural",
      weight: 4,
      passed: !stuffed,
      okNote: topTerm
        ? `Top content term "${topTerm}" appears ${topCount}× (${(density * 100).toFixed(1)}%) — reads as natural language.`
        : "Body reads as natural language; no single term dominates.",
      failNote: `"${topTerm}" appears ${topCount}× (${(density * 100).toFixed(1)}% density) — Play's NLP flags this as keyword stuffing. Replace some mentions with related concepts ("workout", "training", "fitness routine" instead of "fitness" repeated) so the body reads naturally.`,
    }));
  }

  // 20. Average rating ≥ 4.0 (weight 5)
  if (typeof listing.rating === "number" && listing.rating > 0) {
    const r = listing.rating;
    const ratingFloor = bench?.rating?.p25 ?? 4.0;
    const ratingMedian = bench?.rating?.p50 ?? 4.5;
    checks.push(makeCheck({
      label: "Average rating",
      weight: 5,
      passed: r >= 4.0,
      okNote: r >= ratingMedian
        ? `Average rating is ${r.toFixed(1)}/5 — competitive within this category (peers sit near ${ratingMedian.toFixed(1)}).`
        : `Average rating is ${r.toFixed(1)}/5 — clears the 4.0 floor that most store surfaces require for shelf placement.`,
      failNote: r >= 3.5
        ? `Average rating is ${r.toFixed(1)}/5 — below the 4.0 ranking floor. Triage 1–3 star reviews: respond to top themes, ship fixes, prompt happy users for a rating.`
        : `Average rating is ${r.toFixed(1)}/5 — well below ranking floors. Pause copy/screenshot work and focus on the product issues showing up in 1-star reviews; nothing else moves the needle while rating sits here.`,
    }));
  }

  // 21. Rating count credibility (weight 3)
  if (typeof listing.ratingCount === "number") {
    const rc = listing.ratingCount;
    checks.push(makeCheck({
      label: "Rating volume",
      weight: 3,
      passed: rc >= 100,
      okNote: rc >= 10000
        ? `${formatCount(rc)} ratings — strong social proof.`
        : `${formatCount(rc)} ratings — past the 100-rating credibility threshold.`,
      failNote: rc === 0
        ? `No ratings yet. Add an in-app rating prompt after a positive interaction (not on launch) and a 'rate us' link in onboarding.`
        : `Only ${formatCount(rc)} ratings. Aim for at least 100 to clear the credibility threshold; ratings volume also feeds ranking.`,
    }));
  }

  // 22. Last-updated freshness (weight 3)
  if (listing.lastUpdated) {
    const monthsSinceUpdate = monthsSince(listing.lastUpdated);
    if (monthsSinceUpdate !== null) {
      checks.push(makeCheck({
        label: "Listing freshness",
        weight: 3,
        passed: monthsSinceUpdate <= 6,
        okNote: `Updated ${monthsSinceUpdate <= 1 ? "in the last month" : `${monthsSinceUpdate} months ago`} — stores surface fresher listings more.`,
        failNote: `Last update was ${monthsSinceUpdate} months ago. Stores down-rank listings that haven't shipped in 6+ months; a small version bump with refreshed copy resets the freshness signal.`,
      }));
    }
  }

  // 23. Screenshot coverage (weight 4)
  if (Array.isArray(listing.screenshotUrls)) {
    const n = listing.screenshotUrls.length;
    const target = bench?.screenshotCount?.p50 ?? (listing.source === "ios" ? 5 : 4);
    const ideal = Math.max(3, Math.min(target - 3, 6));
    checks.push(makeCheck({
      label: "Screenshot coverage",
      weight: 4,
      passed: n >= ideal,
      okNote: `${n} screenshots — covers the slots that drive most install decisions.`,
      failNote: n === 0
        ? `No screenshots detected. The first three screenshots are the biggest conversion lever after the icon — upload at least ${ideal}.`
        : `Only ${n} screenshot(s). ${listing.source === "ios" ? "iOS allows 10 per device" : "Play allows 8 per device"}; aim for ${ideal}+ so users see scenarios beyond the first frame.`,
    }));
  }

  // ---- Aggregate ------------------------------------------------------
  const totalWeight = checks.reduce((s, c) => s + (c as ScoreCheck & { weight: number }).weight, 0);
  const passedWeight = checks
    .filter((c) => c.passed)
    .reduce((s, c) => s + (c as ScoreCheck & { weight: number }).weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  // Strip the weight field before returning — public ScoreCheck doesn't expose it.
  const publicChecks: ScoreCheck[] = checks.map(({ label, passed, note }) => ({
    label,
    passed,
    note,
  }));

  return { score, grade: gradeFor(score), checks: publicChecks };
}

// ---- URL-only fallback (legacy preview path) ------------------------------

function scoreUrlOnly(url: string): ScoreResult {
  const charSum = url.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const score = (charSum % 30) + 55;
  return {
    score,
    grade: gradeFor(score),
    checks: [
      {
        label: "Listing preview only",
        passed: false,
        note:
          "We haven't fetched the live listing yet — this is a quick preview. Open the detailed report for a real audit.",
      },
    ],
  };
}

// ---- Helpers --------------------------------------------------------------

function gradeFor(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function makeCheck(args: {
  label: string;
  weight: number;
  passed: boolean;
  okNote: string;
  failNote: string;
}): ScoreCheck & { weight: number } {
  return {
    label: args.label,
    passed: args.passed,
    note: args.passed ? args.okNote : args.failNote,
    weight: args.weight,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordPresent(keyword: string, text: string): boolean {
  const lower = text.toLowerCase();
  if (new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(lower)) return true;
  const words = keyword.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return words.every((w) => new RegExp(`\\b${escapeRegex(w)}\\b`).test(lower));
}

function sentenceCount(text: string): number {
  const matches = text.match(/[.!?](\s|$)/g);
  return matches ? matches.length : 1;
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function splitIntoBlocks(text: string): string[] {
  if (!text) return [];
  const doubleNewline = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (doubleNewline.length >= 3) return doubleNewline;

  const lines = text.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (current.length) { blocks.push(current.join("\n")); current = []; }
      continue;
    }
    const isHeader = /^[A-Z][A-Za-z\s&,]{2,60}:?\s*$/.test(trimmed) && !trimmed.endsWith(".");
    const isBullet = /^\s*[•◦●\-*✓✔☑✦➤➜►→★✧▶◉]\s/.test(trimmed);
    const prevIsBullet = current.length > 0 && /^\s*[•◦●\-*✓✔☑✦➤➜►→★✧▶◉]\s/.test(current[current.length - 1]);

    if (isHeader && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [trimmed];
    } else if (isBullet && !prevIsBullet && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [trimmed];
    } else {
      current.push(trimmed);
    }
  }
  if (current.length) blocks.push(current.join("\n"));

  return blocks.length >= 2 ? blocks : doubleNewline.length > 0 ? doubleNewline : [text.trim()];
}

function extractHook(block: string): string {
  if (!block || block.length <= 500) return block;
  const sentences = block.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences || sentences.length <= 3) return block;
  return sentences.slice(0, 3).join("").trim();
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function monthsSince(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = (Date.now() - t) / 86_400_000;
  return Math.max(0, Math.round(days / 30));
}

// ---- Strategic advice (not scored) ----------------------------------------

export interface StrategicAdvisory {
  label: string;
  detail: string;
  category: "ranking" | "conversion" | "maintenance" | "expansion";
}

export function strategicAdvisoriesFor(listing: ScoreListing): StrategicAdvisory[] {
  const out: StrategicAdvisory[] = [];

  out.push({
    label: "Drive review velocity, not just count",
    detail:
      "Fresh reviews count for more than old ones. Trigger an in-app rating prompt after a positive moment (e.g. completing a task), not on launch. Both stores weight recent rating delta.",
    category: "ranking",
  });

  out.push({
    label: "Track conversion rate from search",
    detail:
      "Play Console → Acquisition → Store listing acquisition shows visitor → install conversion. Anything below 25% suggests the icon/screenshots/title are losing visitors who already showed intent.",
    category: "conversion",
  });

  out.push({
    label: "A/B test screenshots and short description",
    detail:
      "Play Console Store Listing Experiments and App Store Connect Product Page Optimization both run real-traffic A/B tests at no cost. Test the first three screenshots first — they're the biggest conversion lever.",
    category: "conversion",
  });

  out.push({
    label: "Localize the listing for top 3 markets",
    detail:
      "Each locale is a separate listing on Play. An English-only listing in Brazil / Japan / Germany under-ranks against localized competitors even if the app itself is localized.",
    category: "expansion",
  });

  if (typeof listing.rating === "number" && listing.rating < 4.3) {
    out.push({
      label: "Fix the top-themed 1-star complaints first",
      detail:
        "Group your 1–3 star reviews by theme (sort by Most Recent in Console). The one or two issues mentioned most often hold your rating ceiling. Ship a fix, then reply to those reviews — Play surfaces developer replies.",
      category: "ranking",
    });
  }

  out.push({
    label: "Ship a small update every 6–8 weeks",
    detail:
      "Both stores weight 'recently updated' in search ranking. A version bump with a refreshed What's New note plus one screenshot refresh is enough to maintain the freshness signal.",
    category: "maintenance",
  });

  return out;
}

// Re-export the loaded benchmarks type so other modules can consume it.
export type { CategoryBenchmarks, Distribution };
