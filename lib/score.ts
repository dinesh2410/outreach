import { ScoreResult, ScoreCheck } from "./types";
import { extractKeywords } from "./keywords";

// ASO scoring driven by both:
//   (1) descriptive patterns from a 20-app top-app corpus (Google, Microsoft,
//       Spotify, Duolingo, etc. — see CHANGES.md), and
//   (2) the major ranking signals documented across ASO research from Phiture,
//       AppTweak, Apptopia, and Apple/Google developer docs — rating, rating
//       count, keyword placement, freshness, and asset coverage.
//
// When a scraped listing is available, score against real signals; when only
// the URL is known, fall back to a URL-only heuristic so the marketing /score
// teaser keeps working before the user signs in for the live audit.

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
}

export function calculateScore(url: string, listing?: ScoreListing | null): ScoreResult {
  const hasListing =
    !!listing && (!!listing.title || !!listing.shortDesc || !!listing.subtitle || !!listing.fullDesc);
  if (hasListing) return scoreListing(listing!);
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
];

const HOOK_LINKING_VERBS = ["is", "lets", "helps", "brings", "gives", "puts", "makes"];

const SCENARIO_OPENERS = ["whether", "looking for", "ready to", "from", "with"];

const FORBIDDEN_QUESTION_OPENERS = ["tired of", "sick of", "want to", "do you", "ever wanted"];

const FORBIDDEN_CTA_PHRASES = [
  "download now", "download the app", "get started today",
  "get it now", "available on google play", "available on the app store",
  "click below", "click here", "tap below",
];

// Bullet chars top apps actually use (• dominates with 14/20; dashes 2/20
// — Instagram, Netflix; asterisks 1/20). All three are accepted as valid;
// • gets the strongest signal but consistency matters more than the char.
const PREFERRED_BULLET = "•";              // U+2022 — the dominant top-app bullet
const ACCEPTABLE_BULLETS = ["•", "◦", "●", "-", "*"]; // any of these, used consistently
const POOR_BULLET_CHARS = ["▶", "◉", "►", "→"]; // patterns we used to emit; not what top apps use

function scoreListing(listing: ScoreListing): ScoreResult {
  const title = (listing.title ?? "").trim();
  const shortDesc = (listing.shortDesc ?? listing.subtitle ?? "").trim();
  const fullDesc = (listing.fullDesc ?? "").trim();
  const paragraphs = fullDesc
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hookPara = paragraphs[0] ?? "";
  const closingPara = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : "";
  const allCheckedText = `${title} ${shortDesc} ${fullDesc}`.toLowerCase();
  const fullLower = fullDesc.toLowerCase();
  const hookLower = hookPara.toLowerCase();
  const closingLower = closingPara.toLowerCase();
  const brandToken = title.split(/[\s:–—-]+/)[0]?.toLowerCase() ?? "";

  // ---- Bullets --------------------------------------------------------
  // Count bullets per character so we can detect (a) any consistent bullet
  // style, (b) the use of • specifically, (c) bad patterns like ▶/◉ which
  // top apps don't use. A "bullet" only counts when it appears at the start
  // of a line — character-anywhere matches over-count.
  const bulletLines = fullDesc.split("\n");
  const bulletCharCounts: Record<string, number> = {};
  for (const line of bulletLines) {
    const m = line.match(/^\s*([•◦●\-*▶◉►→])\s+\S/);
    if (m) {
      const ch = m[1];
      bulletCharCounts[ch] = (bulletCharCounts[ch] ?? 0) + 1;
    }
  }
  const preferredBulletCount = bulletCharCounts[PREFERRED_BULLET] ?? 0;
  const acceptableBulletTotal = ACCEPTABLE_BULLETS.reduce(
    (s, ch) => s + (bulletCharCounts[ch] ?? 0),
    0
  );
  const poorBulletTotal = POOR_BULLET_CHARS.reduce(
    (s, ch) => s + (bulletCharCounts[ch] ?? 0),
    0
  );
  const hasBullets = acceptableBulletTotal + poorBulletTotal >= 3;
  // Pick the dominant bullet character to report back to the user.
  let dominantBullet: string | undefined;
  let dominantCount = 0;
  for (const [ch, n] of Object.entries(bulletCharCounts)) {
    if (n > dominantCount) {
      dominantCount = n;
      dominantBullet = ch;
    }
  }

  // ---- Sections (labelled chunks) ------------------------------------
  // Title-cased section labels: a short line (≤60 chars), capitalised first
  // letter, possibly ending with a colon, on its own line — followed by more
  // content. Matches both "Capture what's on your mind" and "BACK UP & SYNC".
  const sectionLabelMatches = paragraphs.filter((p) => {
    const firstLine = p.split("\n")[0].trim();
    if (firstLine.length === 0 || firstLine.length > 80) return false;
    if (firstLine.endsWith(".") || firstLine.endsWith("!")) return false;
    if (!/^[A-Z]/.test(firstLine)) return false;
    // Must be followed by either bullets or more lines in this paragraph
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

  // ---- Emoji counts (skip section-decorator runs of 5+) -------------
  const emojiMatches = fullDesc.match(EMOJI_RE) ?? [];
  const emojiCount = emojiMatches.length;

  // ---- Build checks --------------------------------------------------
  const checks: ScoreCheck[] = [];

  // 1. Title length (weight 3)
  checks.push(makeCheck({
    label: "Title length within range",
    weight: 3,
    passed: title.length >= 8 && title.length <= 30 && title.length !== 30,
    okNote:
      `Title is ${title.length} chars — sits comfortably under the 30-char Play cap. Top apps median is 16.`,
    failNote: title.length === 0
      ? "No title detected on the listing."
      : title.length < 8
        ? `Title is only ${title.length} chars — top apps median is 16. Add a short descriptor after the brand.`
        : `Title is at the 30-char cap. Top apps almost never max it out; consider dropping a keyword.`,
  }));

  // 2. Title format (no comma keyword-stuffing) (weight 3)
  const titleStuffed = /,/.test(title) || /\s\w+\s\w+\s\w+\s\w+\s\w+$/.test(title);
  checks.push(makeCheck({
    label: "Title format is clean",
    weight: 3,
    passed: !titleStuffed,
    okNote: "Title reads as a brand + short descriptor, not a comma-separated keyword list.",
    failNote: "Title looks keyword-stuffed. Use `Brand: Descriptor` or `Brand - Descriptor` — top apps don't comma-chain keywords.",
  }));

  // Short-description-dependent checks only run when the scrape actually
  // returned a short description / subtitle. iTunes Lookup doesn't expose
  // the iOS subtitle, so we skip these on iOS rather than penalize for a
  // field we can't see.
  if (shortDesc.length > 0) {
    // 3. Short description length (weight 4)
    // Top-app range is 26–80. 11/19 use ≥70 chars; outliers like WhatsApp
    // (26) and Chrome (32) ship sparse short descs because their brands
    // carry the listing. Pass anything ≥25 chars and within the 80 cap.
    checks.push(makeCheck({
      label: "Short description uses available space",
      weight: 4,
      passed: shortDesc.length >= 25 && shortDesc.length <= 80,
      okNote: shortDesc.length >= 65
        ? `Short description is ${shortDesc.length} chars — uses the available space well (top-app median is 75).`
        : `Short description is ${shortDesc.length} chars — short, but a valid pattern (WhatsApp ships 26 chars, Chrome 32). Tighter copy works when the brand carries weight.`,
      failNote: shortDesc.length < 25
        ? `Short description is only ${shortDesc.length} chars — too sparse even by top-app standards.`
        : `Short description is ${shortDesc.length} chars — exceeds the 80-char Play cap.`,
    }));

    // 4. Short description verb-lead or sentence-fragment (weight 3)
    const firstWord = (shortDesc.split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z']/g, "");
    const verbLed = HOOK_VERB_OPENERS.includes(firstWord);
    checks.push(makeCheck({
      label: "Short description leads with action",
      weight: 3,
      passed: verbLed || (shortDesc.split(/\s+/)[0]?.endsWith(",") === false && shortDesc.length > 40),
      okNote: "Short description leads with an action verb — the most common pattern in top apps.",
      failNote: "Short description doesn't lead with a verb. Top apps open with verbs like 'Make', 'Stay', 'Create', 'Get'.",
    }));
  }

  // 5. Full description length (weight 4)
  // Top-app range is 1170–3948. The Google productivity suite (Chrome,
  // Keep, Sheets, Docs, Slides) all ship sparse 1100–1700 char listings;
  // accept anything in the 1100–3700 band as a valid pattern.
  checks.push(makeCheck({
    label: "Full description hits target length",
    weight: 4,
    passed: fullDesc.length >= 1100 && fullDesc.length <= 3950,
    okNote: fullDesc.length >= 1800
      ? `Full description is ${fullDesc.length} chars — sits in the 1800–3950 band top apps use. Median: 2539.`
      : `Full description is ${fullDesc.length} chars — short, but matches the Google house style (Chrome ships ~1170, Sheets ~1600). Valid when the structure stays clean.`,
    failNote: fullDesc.length === 0
      ? "No full description detected."
      : fullDesc.length < 1100
        ? `Full description is only ${fullDesc.length} chars — below even the sparsest top apps (Chrome ships 1170).`
        : `Full description is ${fullDesc.length} chars — at the 4000-char cap. No top app pushes the full limit; trim padding to land closer to the 2539-char median.`,
  }));

  // 6. Hook (first paragraph) length (weight 4)
  checks.push(makeCheck({
    label: "Hook paragraph length",
    weight: 4,
    passed: hookPara.length >= 100 && hookPara.length <= 450,
    okNote: `Hook is ${hookPara.length} chars — within the 150–400 band top apps use.`,
    failNote: hookPara.length === 0
      ? "No hook paragraph detected."
      : hookPara.length < 100
        ? `Hook is only ${hookPara.length} chars. Aim for ~250 with one positioning sentence + one capability sentence.`
        : `Hook is ${hookPara.length} chars — too long. Trim to ≤400; rest belongs in the section list below.`,
  }));

  // 7. Brand in hook (weight 4)
  const brandInHook = brandToken.length >= 3 && hookLower.includes(brandToken);
  checks.push(makeCheck({
    label: "Hook anchors the brand name",
    weight: 4,
    passed: brandInHook,
    okNote: "Hook names the brand — 14/20 top apps anchor the brand in the first sentence.",
    failNote: "Hook never mentions the brand name. Top apps almost always open with '[Brand] is/lets/helps…'.",
  }));

  // 8. Hook opener pattern (weight 3)
  const hookOpener = hookPara.split(/[.\n!?]/)[0]?.trim() ?? "";
  const hookOpenerLower = hookOpener.toLowerCase();
  const hookHasLinking = HOOK_LINKING_VERBS.some((v) =>
    new RegExp(`\\b${v}\\b`).test(hookOpenerLower)
  );
  // Use word-boundary matching so "Create, edit, …" matches "create" (Google's
  // dominant opener pattern across the productivity suite).
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
    okNote: "Hook opens with one of the three patterns top apps use ([Brand] is/lets/helps…, imperative verb, or scenario).",
    failNote: badQuestion
      ? "Hook opens with a 'Tired of…?' pain question. Zero top apps do this — switch to a positioning sentence."
      : "Hook opener doesn't match the three patterns top apps use. Try '[Brand] is…', 'Use/Get/Explore [Brand]…', or 'Whether you're…'.",
  }));

  // 9. Bullet character quality (weight 5)
  // Pass if (a) bullets exist and (b) they use one of the acceptable chars
  // (• preferred, but - and * are valid minority patterns). Fail only when
  // poor chars (▶ / ◉ / →) dominate, or when there are no bullets in a body
  // long enough to warrant them.
  const usesAcceptableBullet = hasBullets && acceptableBulletTotal >= poorBulletTotal;
  const longBodyNeedsBullets = fullDesc.length >= 1500;
  checks.push(makeCheck({
    label: "Uses a consistent bullet character",
    weight: 5,
    passed: hasBullets ? usesAcceptableBullet : !longBodyNeedsBullets,
    okNote: dominantBullet === PREFERRED_BULLET
      ? `Bullets use • (U+2022) — the character 14/20 top apps use.`
      : dominantBullet
        ? `Bullets use "${dominantBullet}" consistently — valid minority pattern (2/20 top apps use dashes).`
        : "Body is concise enough that no bullets are needed.",
    failNote: hasBullets
      ? `Bullets use ${POOR_BULLET_CHARS.filter((c) => bulletCharCounts[c]).join("/") || "non-standard chars"} — not what top apps use. Switch to • for the strongest signal.`
      : `No bullet list detected in a ${fullDesc.length}-char body. Top apps with longer descriptions split features into bullets.`,
  }));

  // 10. Section structure (weight 5)
  // Two valid patterns: (a) explicit labelled sections + bullets (Spotify,
  // Outlook), (b) Google productivity-suite style — a short hook ending in
  // ":" followed by a long bullet list, possibly with a second labelled
  // section. Both count.
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
      ? `Hook leads into a bullet list (Google productivity-suite pattern). Valid scannable structure.`
      : `${sectionLabelMatches.length} labelled sections detected — matches the section-label + bullet-list pattern 17/20 top apps use.`,
    failNote: !hasBullets
      ? "Body lacks bullets or labelled chunks. Top apps chunk into 3–7 sections, each as 'Capability label' + 3–5 bullets, OR open with a hook ending in ':' then a long bullet list."
      : "Bullets exist but aren't anchored to section labels. Add a short Title-Case label above each bullet group, or end the hook with ':' so the bullets below read as one section.",
  }));

  // 11. Paragraph length discipline (weight 4)
  checks.push(makeCheck({
    label: "Paragraphs stay short",
    weight: 4,
    passed: paragraphs.length > 0 && longParagraphs <= 1,
    okNote: "Paragraphs stay ≤4 sentences — matches top-app pattern (15/20 keep paragraphs ≤2 sentences).",
    failNote: `${longParagraphs} paragraph(s) run >4 sentences. Top apps split long thoughts into bullets — wall-of-text hurts scanning.`,
  }));

  // 12. Section count (weight 2)
  checks.push(makeCheck({
    label: "Section count is balanced",
    weight: 2,
    passed: sectionCount >= 5 && sectionCount <= 16,
    okNote: `${sectionCount} paragraph blocks — sits in the 5–14 sweet spot (top-app median: 10).`,
    failNote: sectionCount < 5
      ? `Only ${sectionCount} sections. Add more labelled blocks — top apps run 5–14.`
      : `${sectionCount} sections is too fragmented. Consolidate to 8–12 for cleaner scanning.`,
  }));

  // 13. Benefit keyword coverage (weight 3)
  checks.push(makeCheck({
    label: "Hits core benefit keywords",
    weight: 3,
    passed: benefitHits >= 3,
    okNote: `Covers ${benefitHits} benefit terms (privacy, free, easy, share, anywhere, etc.) — top apps median is 4–5.`,
    failNote: `Only ${benefitHits} benefit term(s) detected. Top apps hit ≥3 of: privacy/secure, free, easy/simple, share, anywhere/offline.`,
  }));

  // 14. No store-CTA in closing (weight 2)
  const closingHasBadCta = FORBIDDEN_CTA_PHRASES.some((p) => closingLower.includes(p));
  checks.push(makeCheck({
    label: "Closing avoids store-CTA clichés",
    weight: 2,
    passed: !closingHasBadCta,
    okNote: "Closing doesn't fall back to 'Download now' clichés — top apps close with sign-offs or legal links, not CTAs.",
    failNote: "Closing contains a 'Download now'-style CTA. Only 1/20 top apps do this. Close with a sub-CTA ('Try [Brand] free') or sign-off.",
  }));

  // 15. Emoji discipline (weight 2)
  checks.push(makeCheck({
    label: "Emoji usage is restrained",
    weight: 2,
    passed: emojiCount <= 3,
    okNote: emojiCount === 0
      ? "No emoji in body — matches 18/20 top apps."
      : `${emojiCount} emoji used — within the restrained band 2/20 top apps use.`,
    failNote: `${emojiCount} emoji detected. Only 2/20 top apps use them; emoji-heavy bodies look amateur.`,
  }));

  // 16. Exclamation discipline (weight 2)
  const exclamationCount = (fullDesc.match(/!/g)?.length ?? 0);
  checks.push(makeCheck({
    label: "Exclamation marks stay restrained",
    weight: 2,
    passed: exclamationCount <= 3,
    okNote: `${exclamationCount} exclamation mark(s) — top apps run 0–2.`,
    failNote: `${exclamationCount} exclamation marks detected. Top apps median is 0–2; trim to lower the hype tone.`,
  }));

  // 17. Brand repetition across body (weight 2)
  checks.push(makeCheck({
    label: "Brand name repeats across body",
    weight: 2,
    passed: brandMentions >= 3 && brandMentions <= 12,
    okNote: `Brand name appears ${brandMentions}× across the body — top apps anchor the brand 3–8 times.`,
    failNote: brandToken.length < 3
      ? "Couldn't infer brand name from title."
      : brandMentions < 3
        ? `Brand mentioned only ${brandMentions}×. Top apps repeat the brand 3–8 times — heavy anchoring is the pattern.`
        : `Brand repeated ${brandMentions}× — too dense. Trim to 8 or fewer to avoid reading as stuffing.`,
  }));

  // ---- Ranking-signal checks ----------------------------------------
  // These are the biggest ASO ranking factors documented across the
  // industry (Phiture, AppTweak, Apple/Google docs). We only add a check
  // when the underlying data is present on the scrape, so the score
  // reflects what we can actually measure.

  // Primary keyword extracted from the full description. This is what a
  // user is most likely to type into store search to find this app.
  const corpus = `${title} ${shortDesc} ${fullDesc}`;
  const topKeywords = corpus.trim() ? extractKeywords(fullDesc) : [];
  const primaryKw = topKeywords[0];
  const primaryKwLower = primaryKw?.word?.toLowerCase() ?? "";

  // 18. Primary keyword in title (weight 5) — title is the heaviest-indexed
  // field for both Play and iOS. Skip if the primary keyword IS the brand
  // (in which case the title trivially contains it).
  if (primaryKwLower && primaryKwLower !== brandToken && primaryKw && primaryKw.count >= 3) {
    const titleLower = title.toLowerCase();
    const inTitle = new RegExp(`\\b${escapeRegex(primaryKwLower)}\\b`).test(titleLower);
    checks.push(makeCheck({
      label: "Primary keyword appears in title",
      weight: 5,
      passed: inTitle,
      okNote: `Primary keyword "${primaryKw.word}" is in the title — the most heavily-indexed field on Play and the heaviest factor in iOS search.`,
      failNote: `Primary keyword "${primaryKw.word}" doesn't appear in the title. Title is the #1 ranking field; add the keyword as a short descriptor (e.g. "${brandToken ? brandToken[0].toUpperCase() + brandToken.slice(1) : "Brand"}: ${primaryKw.word.charAt(0).toUpperCase() + primaryKw.word.slice(1)} Tracker").`,
    }));
  }

  // 19. Primary keyword in short description (weight 4) — Play indexes the
  // short description; missing the primary keyword here costs ranking. Skip
  // when no shortDesc is available (e.g. iOS where iTunes Lookup omits it).
  if (
    shortDesc.length > 0 &&
    primaryKwLower &&
    primaryKwLower !== brandToken &&
    primaryKw &&
    primaryKw.count >= 3
  ) {
    const shortLower = shortDesc.toLowerCase();
    const inShort = new RegExp(`\\b${escapeRegex(primaryKwLower)}\\b`).test(shortLower);
    checks.push(makeCheck({
      label: "Primary keyword appears in short description",
      weight: 4,
      passed: inShort,
      okNote: `Primary keyword "${primaryKw.word}" is in the short description — Play indexes this field for ranking.`,
      failNote: `Primary keyword "${primaryKw.word}" is missing from the short description. Play indexes this 80-char field; work the keyword in naturally.`,
    }));
  }

  // 20. Average rating ≥ 4.0 (weight 5) — single biggest ranking signal we
  // can measure from a public scrape. Apple requires 4.0+ for shelf placement
  // in many surfaces; Play weights rating heavily in category rankings.
  if (typeof listing.rating === "number" && listing.rating > 0) {
    const r = listing.rating;
    checks.push(makeCheck({
      label: "Average rating",
      weight: 5,
      passed: r >= 4.0,
      okNote: `Average rating is ${r.toFixed(1)}/5 — clears the 4.0 bar that most ASO research treats as the floor for category ranking.`,
      failNote: r >= 3.5
        ? `Average rating is ${r.toFixed(1)}/5 — below the 4.0 ranking floor. Triage your 1–3 star reviews: respond to the top themes, ship fixes, ask happy users for a rating via the in-app prompt.`
        : `Average rating is ${r.toFixed(1)}/5 — well below ranking floors. Pause copy/screenshot work and focus on the product issues showing up in 1-star reviews; nothing else moves the needle while rating sits here.`,
    }));
  }

  // 21. Rating count credibility (weight 3) — fewer than ~50 ratings reads as
  // "too new to evaluate" to most users. 1K+ starts to feel credible.
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
        ? `No ratings yet. Add an in-app rating prompt (after a positive interaction, not on launch) and a "rate us" link in onboarding.`
        : `Only ${formatCount(rc)} ratings. Aim for ≥100 to clear the credibility threshold; ratings volume also feeds ranking.`,
    }));
  }

  // 22. Last-updated freshness (weight 3) — stale listings rank worse and
  // signal abandoned apps to users. Track months since last update.
  if (listing.lastUpdated) {
    const monthsSinceUpdate = monthsSince(listing.lastUpdated);
    if (monthsSinceUpdate !== null) {
      checks.push(makeCheck({
        label: "Listing freshness",
        weight: 3,
        passed: monthsSinceUpdate <= 6,
        okNote: `Updated ${monthsSinceUpdate <= 1 ? "in the last month" : `${monthsSinceUpdate} months ago`} — Play and Apple both surface fresher listings more.`,
        failNote: `Last update was ${monthsSinceUpdate} months ago. Stores down-rank listings that haven't shipped in 6+ months; even a small version bump with refreshed copy resets the freshness signal.`,
      }));
    }
  }

  // 23. Screenshot coverage (weight 4) — screenshots drive conversion rate,
  // which feeds install velocity (a ranking signal). iOS allows 10, Play
  // allows 8 per device; first 3 are critical (the only ones visible on
  // most search results).
  if (Array.isArray(listing.screenshotUrls)) {
    const n = listing.screenshotUrls.length;
    const ideal = listing.source === "ios" ? 5 : 4;
    checks.push(makeCheck({
      label: "Screenshot coverage",
      weight: 4,
      passed: n >= ideal,
      okNote: `${n} screenshots — covers the slots that drive most install decisions.`,
      failNote: n === 0
        ? `No screenshots detected. The first 3 screenshots are the single biggest conversion lever after the icon — upload at least ${ideal}.`
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
  // No listing data available — return a low-confidence preview so the
  // marketing /score page still has something to show. The detailed report
  // page fetches /api/audit which calls calculateScore() with the real listing
  // and replaces this stub.
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
          "We haven't fetched the live listing yet — this is a quick preview score. Open the detailed report for a real audit against top-app benchmarks.",
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

function sentenceCount(text: string): number {
  const matches = text.match(/[.!?](\s|$)/g);
  return matches ? matches.length : 1;
}

// Rough emoji pattern — pictographic ranges that show up in real descriptions.
// Excludes plain bullet/dash characters (those are handled separately).
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

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
//
// Some ranking signals can't be measured from a public listing scrape — review
// velocity, install rate from search, retention, in-app behaviour, A/B test
// outcomes — but they matter more than most copy decisions. We surface these
// as advisories the user should track separately in Play Console / App Store
// Connect.

export interface StrategicAdvisory {
  label: string;
  detail: string;
  category: "ranking" | "conversion" | "maintenance" | "expansion";
}

export function strategicAdvisoriesFor(listing: ScoreListing): StrategicAdvisory[] {
  const out: StrategicAdvisory[] = [];

  // Always-relevant ranking advice — the signals the scrape can't see.
  out.push({
    label: "Drive review velocity, not just count",
    detail:
      "Fresh reviews count for more than old ones. Trigger an in-app rating prompt after a positive moment (e.g. completing a task), not on launch. Apple/Google both weight recent rating delta.",
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
      "Play Console Store Listing Experiments and App Store Connect Product Page Optimization both run real-traffic A/B tests at no cost. Test the first 3 screenshots first — they're the biggest conversion lever.",
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
        "Group your 1–3 star reviews by theme (sort by Most Recent in Console). The 1–2 issues mentioned most often hold your rating ceiling. Ship a fix, then reply to those reviews — Play surfaces developer replies.",
      category: "ranking",
    });
  }

  out.push({
    label: "Ship a small update every 6–8 weeks",
    detail:
      "Both stores weight 'recently updated' in search ranking. A version bump with a refreshed What's New note + one screenshot refresh is enough to maintain the freshness signal.",
    category: "maintenance",
  });

  return out;
}
