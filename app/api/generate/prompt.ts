import type { GeneratorInput, Platform } from "@/lib/types";
import type { StoreListing } from "@/lib/store-scraper";
import { getBenchmarks, comfortableRange } from "@/lib/benchmarks";
import { ASO } from "@/lib/aso-standards";

// Prompt builder for the ASO description generator.
//
// Structure and length targets come from a top-20-per-category corpus
// (Productivity, Finance, Health & Fitness, Photo & Video, Social, Lifestyle,
// Education, Utilities, Business, Entertainment) across Play + iOS. The
// per-category bands are injected at request time so a finance app gets
// finance-shaped guidance and a productivity app gets productivity-shaped
// guidance — instead of a single hardcoded set of thresholds.

const TONE_DEFINITIONS: Record<GeneratorInput["tone"], string> = {
  professional:
    "Clear, measured, no exclamation points. Direct sentences. Industry-aware vocabulary without buzzwords. Reads like a thoughtful product page.",
  casual:
    "Conversational contractions ('you'll', 'it's'). Plain words. Occasional second-person ('you'). One-sentence paragraphs are fine. No corporate voice.",
  playful:
    "Light wordplay allowed. Short punchy lines. Sparing use of emoji is permitted (≤2 per variant, only where they earn their place). Personality without being annoying.",
  minimal:
    "Spare. Short sentences. Few adjectives. White space matters — short paragraphs, generous line breaks. Says less, means more.",
};

const ANDROID_FORMAT = `Format rules — Google Play:
- PLAIN TEXT ONLY. NO HTML tags (no <b>, <i>, <h1>, <br>, etc.). The output pastes directly into Play Console — tags would appear as visible "<b>...</b>" garbage.
- NO markdown either (no **bold**, no _italic_). For emphasis use rephrasing.
- BULLET CHARACTER: use • (U+2022) for every bullet. Do NOT use ▶, ◉, –, *, or > as bullets. One bullet character per variant.
- SECTION LABELS: Title-Cased label on its own line, optionally ending with a colon. NOT ALL-CAPS. Use labels like "Capture what's on your mind", "Back Up Photos & Videos", "Easily connect with anyone:".
- Section structure: each section is [Label] then a blank line then 3–5 bullets (or a 1–2 sentence paragraph).
- Sections separated by blank lines.
- Emoji: ≤2 total across the whole description, and only when tone permits. Default is zero.
- Exclamation marks: ≤2 across the whole description.
- Brand name: appears in the first sentence AND repeats 3–8 times across the body.`;

const IOS_FORMAT = `Format rules — Apple App Store:
- NO HTML tags. NO URLs or hyperlinks. NO emojis.
- BULLET CHARACTER: use • (U+2022) for every bullet. One bullet character per variant.
- SECTION LABELS: Title-Cased label on its own line. Not ALL-CAPS by default.
- Apple does NOT index the description. Write for the human reader, not the algorithm. Save keyword density work for the title/subtitle.`;

// Forbidden short-description openers — these phrases waste the first 30
// characters (the most heavily indexed slot of the short description) on
// filler before any functional keyword appears. Google Play's ranking
// algorithm prioritises keywords located in the opening tokens; burning
// them on greetings/intros costs ranking signal.
const SHORT_DESC_FORBIDDEN_OPENERS = `Short description openers — DO NOT start with any of these patterns:
  - "Welcome to…"   - "Introducing…"   - "Discover the…"   - "Discover a…"
  - "The new…"      - "The all-new…"   - "The best…"       - "Meet [Brand]…"
  - "Looking for…"  - "Are you looking…"   - "Say hello to…"   - "Presenting…"
Reason: Google Play indexes the first 30 characters of the short description most heavily. The opening slot must carry a functional keyword, not filler.
Instead: lead with a verb ("Track…", "Build…", "Capture…", "Plan…") OR with the primary descriptor itself ("Calorie tracking with…", "Habit tracker for…").`;

const HOOK_PATTERNS = `Hook openers (pick ONE pattern per variant):
  A. "[Brand] is/lets/helps/brings [outcome]…"
     Example: "Spotify is your guide to mental health, well-being and personal development."
     Example: "WhatsApp from Meta is a FREE messaging and video calling app."
  B. Imperative verb: "Use/Get/Browse/Learn/Explore/Discover [Brand]…"
     Example: "Use Microsoft Authenticator to easily and securely sign in to all your online accounts."
  C. Scenario: "Whether you're [situation]…" or "Stay [outcome]…"
     Example: "Whether you're connecting with friends or growing a business, WhatsApp brings everyone together."

Forbidden hook patterns:
  - Question openers: "Tired of slow apps?", "Want to be more productive?", "Do you struggle with…?"
  - Generic positioning: "Welcome to…", "Introducing…"
  - Founder story: "We built X because…"
The hook must contain the brand name AND name an outcome/capability in 1–2 sentences, 150–400 chars total.`;

const SKELETON = `Description skeleton (every variant follows this):

1. HOOK (1–2 sentences, 150–400 chars; target ~250)
   - Use one of the three opener patterns above.
   - Sentence 1: positioning ([Brand] + outcome).
   - Sentence 2: a concrete capability or proof point ("It's used to…", "Built for…", "Works offline, syncs across devices.").
   - The brand name MUST appear in this paragraph.

2. (blank line)

3. SECTION 1 — Title-Cased label, then 3–5 bullets
   - Label examples to imitate: "Back Up Photos & Videos", "Capture what's on your mind", "Stay organized and on time", "Built for privacy", "Works everywhere you do".
   - Bullet format: "• " + verb-led capability + " " + benefit/scope, 8–18 words total.
   - Bullet examples: "• Sync your notes across every device automatically.", "• Find any photo by typing what's in it — beach, dog, last summer.".
   - NEVER write bullets as bare feature nouns ("• End-to-end encryption"). Always verb + benefit.

4. (blank line)

5. SECTION 2 — same structure (label + bullets)

6. (blank line)

7. SECTION 3 — same structure (label + bullets or a short paragraph)

8. (blank line, optional)

9. SHORT CONTEXT/AUDIENCE paragraph (optional, 1–2 sentences, ≤2 sentences/paragraph)
   - Use only generic, true context: "Built for indie developers, solo founders, and small teams.", "Free to use, no ads, no trackers.".
   - DO NOT invent: numbers of users, awards, ratings, press mentions, named customers, percentage stats.

10. (blank line)

11. CLOSING (1 short sentence, ≤90 chars)
    - Soft sign-off OR a sub-CTA. NOT "Download now" energy.
    - Good: "Start your free trial — your first focus session is on us.", "Open [Brand] tomorrow morning — your day will already be planned."
    - Forbidden phrases: "Download now", "Get started today", "Available on Google Play", "Available on the App Store", "Click below", "Tap to install".

Paragraph length: NO paragraph exceeds 4 sentences; keep most paragraphs to ≤2 sentences.`;

// Cross-category benefit lexicon. Category-specific vocabulary is appended at
// runtime from the benchmarks file.
const BENEFIT_LEXICON = `Benefit/feature vocabulary (use 3–5 of these in the body — not all, and don't stuff):
privacy, secure, encrypted, end-to-end, free, easy, easily, simple, quick, fast, share, shared, sync, offline, anywhere, one place, built-in, automatic, automatically, help.
Strong cross-category coverage: privacy, help, free, share, easily, secure.`;

// Build a category-specific block that pins length bands, bullet preference,
// and a category-defining vocabulary list to the prompt. Falls back to a
// neutral block if benchmarks aren't loaded.
function buildCategoryBlock(category: string): string {
  const { data: bench, category: slug } = getBenchmarks(category);
  if (!bench) return "";

  const titleRange = comfortableRange(bench.titleLength);
  const shortRange = comfortableRange(bench.shortDescLength);
  const fullRange = comfortableRange(bench.fullDescLength);
  const hookRange = comfortableRange(bench.hookLength);
  const sectionRange = comfortableRange(bench.sectionCount);

  const bigrams = bench.topVocabulary?.bigrams?.slice(0, 10)
    .map((b) => b.word)
    .filter((b) => !/^https?\b|policy|terms/.test(b))
    .join(", ");

  const fullTargetLow = fullRange
    ? Math.max(ASO.FULL_DESC_FLOOR, fullRange.low)
    : ASO.FULL_DESC_FLOOR;
  const fullTargetHigh = fullRange
    ? Math.min(ASO.FULL_DESC_CEILING, fullRange.high)
    : ASO.FULL_DESC_CEILING;

  const lines: string[] = [
    `Category-specific targets (this app is in: ${slug.replace(/_/g, " & ")}).`,
    titleRange ? `- Title length: aim ${titleRange.low}–${titleRange.high} chars (median ${titleRange.median}; hard cap ${ASO.TITLE_MAX}).` : "",
    shortRange ? `- Short description: aim ${Math.max(ASO.SHORT_DESC_MIN, shortRange.low)}–${Math.min(ASO.SHORT_DESC_MAX, shortRange.high)} chars (median ${shortRange.median}; hard cap ${ASO.SHORT_DESC_MAX}). MINIMUM ${ASO.SHORT_DESC_MIN} chars — DO NOT ship a short description shorter than this.` : "",
    fullRange ? `- Full description: TARGET ${fullTargetLow}–${fullTargetHigh} chars (median ${fullRange.median}). MINIMUM ${fullTargetLow} chars. Do NOT ship a variant shorter than this — add sections rather than padding. Do NOT push past ${ASO.FULL_DESC_CEILING} chars.` : "",
    hookRange ? `- Hook (first paragraph): aim ${hookRange.low}–${hookRange.high} chars (median ${hookRange.median}).` : "",
    sectionRange ? `- Section count: aim ${Math.max(ASO.SECTION_MIN, sectionRange.low)}–${Math.min(ASO.SECTION_MAX, sectionRange.high)} labelled chunks (median ${sectionRange.median}). Add a section if you're short on length.` : "",
    bigrams ? `- Category vocabulary to draw from naturally (use 2–4, do NOT stuff): ${bigrams}.` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

// Build a reference-examples block from the category corpus. Drops 2–3
// high-rated real listings into the prompt so the LLM can see the
// structural patterns directly — hook shape, section labels, bullet style,
// closing line. The examples are framed as "learn the structure, do NOT
// copy the wording" so the model doesn't paraphrase any specific brand.
function buildExamplesBlock(category: string): string {
  const { data: bench } = getBenchmarks(category);
  const examples = bench?.exampleListings ?? [];
  if (examples.length === 0) return "";

  const blocks = examples.map((ex, i) => {
    const head = `Example ${i + 1} (${ex.source === "play" ? "Play" : "App Store"})`;
    const meta = [
      ex.title ? `Title: ${ex.title}` : null,
      ex.shortDesc ? `Short description: ${ex.shortDesc}` : null,
    ].filter(Boolean).join("\n");
    return `${head}\n${meta}\n\nFull description:\n${ex.fullDesc}`;
  });

  return `Reference structures — these are real category-leading listings. Learn the STRUCTURE (hook shape, section labels, bullet phrasing, closing line). Do NOT copy the wording, brand names, claims, statistics, or any specific phrases. Treat them as scaffolding to inform your own original copy.

${blocks.join("\n\n---\n\n")}`;
}

// When the developer confirmed primary + secondary keywords via the clarify
// step, we hard-pin them into the prompt so the model uses these exact
// phrases instead of inferring its own descriptor from features. This is the
// single highest-leverage knob for indexing — Google Play heavily weights
// keyword placement in title slot 0, short-desc first sentence, and the
// long-desc opening paragraph (per the Play ASO ruleset, 2025/2026).
function buildKeywordBlock(input: GeneratorInput): string {
  const primary = input.primaryKeyword?.trim();
  const secondary = input.secondaryKeyword?.trim();
  if (!primary && !secondary) return "";

  const lines: string[] = [
    "════════════════════════════════════════════════════════════════════",
    "CONFIRMED KEYWORDS — DEVELOPER-SELECTED, HARD OVERRIDE",
    "════════════════════════════════════════════════════════════════════",
    "These are NOT suggestions. The developer explicitly chose these phrases. They must appear verbatim where specified — no synonyms, no rewording.",
    "",
  ];
  if (primary) {
    lines.push(
      `★ PRIMARY KEYWORD: "${primary}"`,
      `   1. Title — MUST contain the exact phrase "${primary}", front-loaded within the first 15 characters of the 30-char title. Format: "${primary} — Brand" OR "Brand: ${primary}" OR "${primary} Brand". If neither pattern fits, lead with "${primary}".`,
      `   2. Short description / Subtitle — the FIRST SENTENCE must contain the exact phrase "${primary}". Not the second sentence, not anywhere else first — the literal first sentence.`,
      `   3. Hook paragraph — the opening paragraph of the full description must contain the exact phrase "${primary}".`,
      `   4. Body — the exact phrase "${primary}" must appear 2-3 more times, in DIFFERENT sections. Never back-to-back. Never in the same sentence as the previous occurrence.`,
      `   5. keywords[] array — the first item MUST be exactly "${primary}" (lowercase). The other items can be related search terms.`,
      `   6. Light inflection (singular/plural, capitalisation matching the surrounding sentence) is allowed; substituting synonyms is NOT.`,
      ``,
    );
  }
  if (secondary) {
    lines.push(
      `★ SECONDARY KEYWORD: "${secondary}"`,
      `   1. Body — the exact phrase "${secondary}" must appear AT LEAST ONCE in the full description, ideally in a different section than the primary.`,
      `   2. keywords[] array — must be included in the array (not necessarily first).`,
      `   3. Use it as a related semantic concept reinforcing the primary, not as a substitute.`,
      `   4. Do NOT force it into the title or short description if it makes the copy awkward.`,
      ``,
    );
  }
  lines.push(
    `DENSITY DISCIPLINE: NEITHER keyword may exceed ~2.5% of the body word count. Google Play's NLP penalises stuffing. Round out the body with 4–6 related semantic entities from the category vocabulary rather than repeating the primary more than 4 times total.`,
    `FORBIDDEN: never use promotional fillers like "Best", "Free", "#1", "Top-rated" inside the title.`,
    "════════════════════════════════════════════════════════════════════",
  );
  return `\n${lines.join("\n")}\n`;
}

function buildCurrentListingBlock(listing: StoreListing | null): string {
  if (!listing) return "";
  const parts: string[] = [];
  if (listing.title) parts.push(`Current title: ${listing.title}`);
  if (listing.shortDesc) parts.push(`Current short description: ${listing.shortDesc}`);
  if (listing.subtitle) parts.push(`Current subtitle: ${listing.subtitle}`);
  if (listing.fullDesc) {
    const trimmed = listing.fullDesc.length > 1500 ? listing.fullDesc.slice(0, 1500) + "..." : listing.fullDesc;
    parts.push(`Current full description:\n${trimmed}`);
  }
  if (parts.length === 0) return "";
  return `\nCurrent live listing on the store (the developer wants alternatives that are GENUINELY DIFFERENT — don't mimic this structure or phrasing; find untapped angles, sharper hooks, and tighter copy):\n\n${parts.join("\n\n")}\n`;
}

export function buildPrompt(
  input: GeneratorInput,
  platform: Platform,
  currentListing: StoreListing | null = null
): string {
  const platformBlock =
    platform === "android"
      ? `Target store: Google Play (Android).
Each variant MUST include "shortDesc" (max 80 chars). Do NOT include "subtitle".`
      : `Target store: Apple App Store (iOS).
Each variant MUST include "subtitle" (max 30 chars). Do NOT include "shortDesc".`;

  const formatRules = platform === "android" ? ANDROID_FORMAT : IOS_FORMAT;

  const clarifyBlock =
    input.clarifications && input.clarifications.length > 0
      ? `\nAdditional context (from follow-up questions the developer answered):\n${input.clarifications
          .map((c) => `- ${c.question} → ${c.answer}`)
          .join("\n")}\n`
      : "";

  const keywordBlock = buildKeywordBlock(input);

  const toneDefinition = TONE_DEFINITIONS[input.tone];
  const currentListingBlock = buildCurrentListingBlock(currentListing);
  const categoryBlock = buildCategoryBlock(input.category);
  const examplesBlock = buildExamplesBlock(input.category);

  return `You are an ASO (App Store Optimization) expert writing real store listings for an indie developer. Follow the structural patterns of category-leading listings — patterns derived from a current scan of the top 20 apps in each category.

App name: ${input.appName}
Category: ${input.category}
Key features: ${input.features}
${input.audience ? `Target audience: ${input.audience}` : ""}
Tone: ${input.tone} — ${toneDefinition}
${input.storeUrl ? `Existing store URL: ${input.storeUrl}` : ""}
${currentListingBlock}${clarifyBlock}${keywordBlock}
${platformBlock}

${formatRules}

${SHORT_DESC_FORBIDDEN_OPENERS}

${HOOK_PATTERNS}

${SKELETON}

${BENEFIT_LEXICON}

${categoryBlock}

${examplesBlock}

Keyword anchoring rules (these dictate where indexed keywords land):
1. PRIMARY DESCRIPTOR. If the developer confirmed a primary keyword (see "CONFIRMED KEYWORDS" block above, if present), use that EXACT phrase as the primary descriptor — do not substitute a synonym. If no confirmed keyword was provided, infer the single most search-worthy functional descriptor from the features (e.g. "calorie tracker", "habit tracker", "budget planner", "photo editor"). This descriptor MUST match keywords[0] in the output array.
2. TITLE PLACEMENT. The primary descriptor MUST appear in the title, FRONT-LOADED — within the first half of the 30-char limit. Optimal title structure: "Brand: Descriptor" or "Brand - Descriptor" (e.g. "Notewise: AI Notes" not "Notewise"). A bare brand-only title leaves indexing weight on the table.
3. SHORT DESCRIPTION FIRST SENTENCE. The primary descriptor MUST appear in the FIRST SENTENCE of the short description (Android), or the subtitle (iOS). The first 30 characters of the short description are the most heavily indexed slot of that field — do NOT waste them on filler. (Filler openers are listed above; do not use any of them.)
4. HOOK PARAGRAPH. The primary descriptor MUST appear in the opening paragraph (the hook) of the full description. The hook is the most heavily indexed body slot.
5. NATURAL REPETITION. The primary descriptor should appear 2–3 additional times naturally distributed across the body. NEVER place the same phrase back-to-back (no "habit tracker habit tracker" or "habit tracker. The habit tracker…"). Each repetition should sit in a different section.
6. SEMANTIC ENTITIES. Beyond the primary descriptor, include 4–6 closely related concepts from the category vocabulary (e.g. for "habit tracker": "streak", "routine", "reminder", "daily goal", "consistency", "log"). These signal topic relevance via semantic entity recognition.
7. DENSITY DISCIPLINE. NO single content word/phrase should appear more often than ~2.5% of words in the body. If you find yourself repeating "fitness" 12 times in 2400 chars, replace half with related concepts ("workout", "training", "exercise", "routine"). Google Play's NLP penalises any term whose density exceeds natural-language norms.

Produce ONE keyword-optimized variant (approach="keyword"):
   - Hook uses opener pattern A or B, front-loading the primary search term naturally.
   - Section labels reuse search vocabulary ("Track your sleep", "Plan your day", "Edit photos on the go").
   - MUST include a "keywords" array with 5–8 lowercase search terms this listing optimizes for (e.g. "pomodoro timer", "focus app"). Real user-typed terms only — keywords[0] must be the primary descriptor.

Length enforcement (CRITICAL — listings shorter than these floors look under-developed in the store):
- title: MUST be "Brand" alone OR "Brand: Descriptor" / "Brand - Descriptor" — NEVER comma-separated keyword lists ("App, Tracker, Planner" is wrong; "Notewise: AI Notes" is right). Title must end as a complete thought; no partial words ("Todaywise: Intelligent Daily" is wrong — Daily what?). Hard cap 30 chars.
- ${platform === "android" ? "shortDesc: MUST be ${ASO.SHORT_DESC_MIN}–${ASO.SHORT_DESC_MAX} characters. Lead with a verb when possible (Stay, Make, Create, Listen…). End as a complete clause. DO NOT ship a short description under ${ASO.SHORT_DESC_MIN} chars — that wastes the most prominent above-the-fold slot." : "subtitle: complete tagline, not cut off. Hard cap 30 chars."}
- fullDesc: MINIMUM ${ASO.FULL_DESC_FLOOR} chars, TARGET based on category benchmarks above. If you can't reach ${ASO.FULL_DESC_FLOOR} with the features given, you're under-using the canvas — add a section on use cases, an integrations section, or a 'Built for' audience block.
- DO NOT push past ${ASO.FULL_DESC_CEILING} chars. The 4000-char cap is not a target — substantial but not stuffed is the bar.

Voice rules:
- Sound like a developer wrote it, not a marketing team. No hype.
- NEVER invent specific numbers (no "10,000 users", no fake ratings, no fabricated awards, no press names, no customer names).
- Match the requested tone consistently. Tone definition: ${toneDefinition}
- Repeat the brand name 3–8 times across the body. Heavy brand anchoring helps readers retain the name; it is not stuffing.

Return ONLY the structured object with exactly one variant. No commentary.`;
}

// Third pass — only runs when refineDraft returned a variant under the
// length floor. The model gets the draft back and is told exactly how much
// it needs to grow. We DO NOT ask it to rewrite from scratch; we ask it to
// add new labelled sections while preserving what already worked.
export function buildExpandPrompt(
  input: GeneratorInput,
  platform: Platform,
  draft: Array<{
    approach: "keyword";
    title: string;
    shortDesc?: string;
    subtitle?: string;
    fullDesc: string;
    keywords?: string[];
  }>,
  shorts: Array<{ index: number; needFullExpand: boolean; needShortExpand: boolean }>
): string {
  const formatRules = platform === "android" ? ANDROID_FORMAT : IOS_FORMAT;
  const toneDefinition = TONE_DEFINITIONS[input.tone];
  const categoryBlock = buildCategoryBlock(input.category);
  const keywordBlock = buildKeywordBlock(input);

  const v = draft[0];
  const s = shorts[0];
  const floor = ASO.FULL_DESC_FLOOR;
  const target = `${ASO.FULL_DESC_FLOOR}–${ASO.FULL_DESC_CEILING}`;
  const needs: string[] = [];
  if (s.needFullExpand) {
    needs.push(
      `fullDesc is currently ${v.fullDesc.length} chars — MUST be at least ${floor} (target ${target}). Add ${floor - v.fullDesc.length}+ chars of NEW content as one or two new labelled sections (use cases, target audiences, what's included, integrations, getting started). DO NOT pad existing sentences. DO NOT repeat content from earlier sections.`
    );
  }
  if (s.needShortExpand) {
    needs.push(
      `shortDesc is currently ${(v.shortDesc ?? "").length} chars — MUST be ${ASO.SHORT_DESC_MIN}–${ASO.SHORT_DESC_MAX}. Expand it into a full clause that leads with what the app does.`
    );
  }

  return `You are an ASO expert. You wrote a store-listing variant for an indie developer, and it came back too short to fill the store listing canvas well. Your job here is narrow: EXPAND the listing by adding new labelled sections, while preserving everything that's already strong.

App: ${input.appName} (${input.category}). Tone: ${input.tone} — ${toneDefinition}.

${categoryBlock}
${keywordBlock}
${formatRules}

${HOOK_PATTERNS}

EXPAND TARGETS:
${needs.join("\n")}

CURRENT DRAFT:

--- Variant 1: approach="keyword" ---
title: ${v.title}
${v.shortDesc !== undefined ? `shortDesc: ${v.shortDesc}` : ""}${v.subtitle !== undefined ? `subtitle: ${v.subtitle}` : ""}
${v.keywords ? `keywords: ${v.keywords.join(", ")}` : ""}
fullDesc:
${v.fullDesc}

Rules:
- Add 1–2 new labelled sections to grow the fullDesc to the target band. Good additions: "Built for [audience]", "Use cases", "What's included", "How to get started", "Why teams choose [Brand]". Each new section follows the same structure as the existing ones: Title-Case label, blank line, 3–5 bullets using • (U+2022).
- DO NOT repeat content from earlier sections. New material only.
- DO NOT pad existing sentences with filler words ("comprehensive", "seamless", "powerful"). Add NEW capability content instead.
- DO NOT invent specific numbers, ratings, customers, awards, or press mentions.
- Keep the "keywords" array intact.

Return ONLY the structured object with exactly one variant. No commentary.`;
}

// Second pass: the model critiques its own draft against the format spec, then returns an improved variant.
// Falls back to the draft on failure; never makes output worse.
export function buildRefinePrompt(
  input: GeneratorInput,
  platform: Platform,
  draft: Array<{
    approach: "keyword";
    title: string;
    shortDesc?: string;
    subtitle?: string;
    fullDesc: string;
    keywords?: string[];
  }>
): string {
  const formatRules = platform === "android" ? ANDROID_FORMAT : IOS_FORMAT;
  const toneDefinition = TONE_DEFINITIONS[input.tone];

  const categoryBlock = buildCategoryBlock(input.category);
  const examplesBlock = buildExamplesBlock(input.category);
  const keywordBlock = buildKeywordBlock(input);
  const v = draft[0];

  return `You are an ASO expert reviewing a first-draft store listing and improving it against the structural patterns of category-leading listings.

App: ${input.appName} (${input.category}). Tone: ${input.tone} — ${toneDefinition}.

${categoryBlock}
${keywordBlock}
${examplesBlock}

${formatRules}

${HOOK_PATTERNS}

${SKELETON}

DRAFT TO REVIEW (return one improved variant — approach="keyword"):

--- Variant 1: approach="keyword" ---
title: ${v.title}
${v.shortDesc !== undefined ? `shortDesc: ${v.shortDesc}` : ""}${v.subtitle !== undefined ? `subtitle: ${v.subtitle}` : ""}
${v.keywords ? `keywords: ${v.keywords.join(", ")}` : ""}
fullDesc:
${v.fullDesc}

CRITIQUE checklist (run silently; act on what's weak; LEAVE what's strong alone):
0. COMPLETENESS — read the title, shortDesc/subtitle, and closing line. Each must end as a complete thought. NO dangling fragments. Rewrite if anything ends on a partial word/phrase ("Daily" — daily what?), comma-stuffed keywords ("App, Tracker, Planner"), or trailing prepositions.
0a. PRIMARY-DESCRIPTOR PLACEMENT (high-leverage indexing checks):
    - Title MUST front-load the primary descriptor in the first half of the 30-char title, with "Brand: Descriptor" or "Brand - Descriptor" structure. Rewrite bare brand-only titles by appending a functional descriptor.
    - Short description (Android) MUST contain the primary descriptor in its FIRST SENTENCE. Rewrite any short description that opens with "Welcome to", "Introducing", "Discover the", "The new", "The best", "Meet [Brand]", "Looking for…", "Say hello to", "Presenting" — these waste the most heavily indexed slot.
    - Full description hook (first paragraph) MUST contain the primary descriptor.
    - Body should repeat the primary descriptor 2–3 more times across DIFFERENT sections, never back-to-back. Include 4–6 related semantic entities from the category vocabulary so the body reads as topically rich, not term-stuffed.
0b. DENSITY — scan the body. If any single content word appears >2.5% of the body's words (e.g. "fitness" 12× in 2400 chars), Google Play's NLP treats it as keyword stuffing. Replace half the occurrences with related concepts.
1. HOOK — does it use opener pattern A, B, or C? Does it contain the brand name? Is it 150–400 chars? Pain-question openers ("Tired of…?") are FORBIDDEN. Rewrite to "[Brand] is/lets/helps…" or "Use/Get/Explore [Brand]…" or "Whether you're [scenario]…".
2. SECTION SCAFFOLDING — body must be 3–7 sections, each as: Title-Cased label (NOT ALL-CAPS) → 3–5 bullets using • (U+2022). Wall-of-text or ALL-CAPS-header style is wrong by default. Rewrite labels into Title-Case if currently in caps.
3. BULLET QUALITY — every bullet must be verb-led + benefit/scope (8–18 words). Bare feature nouns ("• End-to-end encryption") are wrong. Rewrite as "• Encrypts every message end-to-end, so only you and the recipient see it.".
4. BULLET CHARACTER — every bullet must use • (U+2022). If draft uses ▶, ◉, –, *, or >, swap to •.
5. PARAGRAPH LENGTH — no paragraph longer than 4 sentences. Split into bullets if it runs long.
6. EMOJI/EXCLAMATION DISCIPLINE — emoji ≤2 across the whole description (default 0); exclamation marks ≤2. Strip excess.
7. CLOSING — must be a soft sign-off or sub-CTA. FORBIDDEN: "Download now", "Get started today", "Available on Google Play/App Store", "Click below". Rewrite as a single short sentence echoing the hook OR naming a concrete moment of use.
8. FABRICATIONS — strip made-up numbers, ratings, awards, customer names, press mentions. Replace with generic true context ("for solo writers", "no ads, no trackers") or remove.
9. BRAND ANCHORING — brand name should appear 3–8 times across the body. Add it to section labels or bullet lead-ins if too sparse; remove if it appears >10 times.
10. LENGTH — fullDesc MUST be ${ASO.FULL_DESC_FLOOR}–${ASO.FULL_DESC_CEILING} chars. If under floor, EXPAND by adding a new labelled section (use cases, audiences, integrations, what's included). Do NOT pad existing sentences with filler ("comprehensive", "seamless"). shortDesc MUST be ${ASO.SHORT_DESC_MIN}–${ASO.SHORT_DESC_MAX} chars; rewrite anything under ${ASO.SHORT_DESC_MIN}.
11. TONE CONSISTENCY — variant sounds like the tone definition end-to-end. No corporate-speak in casual, no hype in professional.
12. KEYWORDS ARRAY — MUST include the "keywords" array (5–8 lowercase search terms). keywords[0] must be the primary descriptor that appears in the title.

Return ONE improved variant in the structured object. If the draft is already strong on a check, leave it alone. Only rewrite what's weak.

Return ONLY the structured object. No commentary.`;
}
