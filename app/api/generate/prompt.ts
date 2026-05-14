import type { GeneratorInput, Platform } from "@/lib/types";
import type { StoreListing } from "@/lib/store-scraper";

// Prompt builder for the ASO description generator.
//
// The structure below is derived from a corpus analysis of 20 top-tier Play
// Store listings (Google, Microsoft, and category leaders — see CHANGES.md).
// Every length target, opener pattern, and formatting rule is backed by the
// data. Where the corpus disagreed with conventional ASO advice, the corpus
// wins (e.g. top apps don't use ALL-CAPS headers, don't use the full 4000
// chars, and don't close with "Download now").

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

const ANDROID_FORMAT = `Format rules — Google Play (DERIVED FROM TOP-APP CORPUS):
- PLAIN TEXT ONLY. NO HTML tags (no <b>, <i>, <h1>, <br>, etc.). The output pastes directly into Play Console — tags would appear as visible "<b>...</b>" garbage.
- NO markdown either (no **bold**, no _italic_). For emphasis use rephrasing.
- BULLET CHARACTER: use • (U+2022) for every bullet. 14/20 top apps use • exclusively. Do NOT use ▶, ◉, –, *, or > as bullets. One bullet character per variant.
- SECTION LABELS: Title-Cased label on its own line, optionally ending with a colon. NOT ALL-CAPS — only 5/20 top apps use ALL-CAPS headers; the dominant pattern (17/20) is Title-Case labels like "Capture what's on your mind" or "Back Up Photos & Videos" or "Easily connect with anyone:".
- Section structure: each section is [Label] then a blank line then 3–5 bullets (or a 1–2 sentence paragraph).
- Sections separated by blank lines.
- Emoji: ≤2 total across the whole description, and only when tone permits. 18/20 top apps use zero emoji.
- Exclamation marks: ≤2 across the whole description. Top apps median is 0–2.
- Brand name: appears in the first sentence AND repeats 3–8 times across the body.`;

const IOS_FORMAT = `Format rules — Apple App Store:
- NO HTML tags. NO URLs or hyperlinks. NO emojis.
- BULLET CHARACTER: use • (U+2022) for every bullet. One bullet character per variant.
- SECTION LABELS: Title-Cased label on its own line. Not ALL-CAPS by default.
- Apple does NOT index the description. Write for the human reader, not the algorithm. Save keyword density work for the title/subtitle.`;

// Hook openers and forbidden patterns come straight from the corpus analysis.
const HOOK_PATTERNS = `Hook openers (pick ONE pattern per variant — these are the three patterns 17/20 top apps use):
  A. "[Brand] is/lets/helps/brings [outcome]…"
     Example: "Spotify is your guide to mental health, well-being and personal development."
     Example: "WhatsApp from Meta is a FREE messaging and video calling app."
  B. Imperative verb: "Use/Get/Browse/Learn/Explore/Discover [Brand]…"
     Example: "Use Microsoft Authenticator to easily and securely sign in to all your online accounts."
  C. Scenario: "Whether you're [situation]…" or "Stay [outcome]…"
     Example: "Whether you're connecting with friends or growing a business, WhatsApp brings everyone together."

Forbidden hook patterns (zero top apps use these):
  - Question openers: "Tired of slow apps?", "Want to be more productive?", "Do you struggle with…?"
  - Generic positioning: "Welcome to…", "Introducing…"
  - Founder story: "We built X because…"
The hook must contain the brand name AND name an outcome/capability in 1–2 sentences, 150–400 chars total.`;

const SKELETON = `Description skeleton (derived from top-app corpus — every variant follows this):

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
    - Forbidden phrases (zero top apps use these): "Download now", "Get started today", "Available on Google Play", "Available on the App Store", "Click below", "Tap to install".

Total length target: 1800–3000 chars for keyword/conversion variants, 1200–1800 for brand. Top-app median is 2539. Hard cap 4000 but DO NOT push that limit — none of the top apps do.
Paragraph length: NO paragraph exceeds 4 sentences. 15/20 top apps keep paragraphs to ≤2 sentences.`;

// A small lexicon of benefit/feature words used heavily across top apps.
// We give the model permission to draw from this — it nudges output closer to
// the search vocabulary real users use.
const BENEFIT_LEXICON = `Benefit/feature vocabulary used by top apps (use 3–5 of these in the body — not all, and don't stuff):
privacy, secure, encrypted, end-to-end, free, easy, easily, simple, quick, fast, share, shared, sync, offline, anywhere, one place, built-in, automatic, automatically, help.
Top single words by corpus coverage: privacy (14/20 apps), help (12/20), free (11/20), share (10/20), easily (10/20), secure (8/20).`;

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

  const toneDefinition = TONE_DEFINITIONS[input.tone];
  const currentListingBlock = buildCurrentListingBlock(currentListing);

  return `You are an ASO (App Store Optimization) expert writing real store listings for an indie developer. You follow the patterns of top-tier listings (Google, Microsoft, Spotify, Duolingo, Netflix, WhatsApp, etc.) — those patterns were extracted from real data, not invented.

App name: ${input.appName}
Category: ${input.category}
Key features: ${input.features}
${input.audience ? `Target audience: ${input.audience}` : ""}
Tone: ${input.tone} — ${toneDefinition}
${input.storeUrl ? `Existing store URL: ${input.storeUrl}` : ""}
${currentListingBlock}${clarifyBlock}
${platformBlock}

${formatRules}

${HOOK_PATTERNS}

${SKELETON}

${BENEFIT_LEXICON}

Produce THREE variants. ALL THREE follow the skeleton above identically. The angle differs — the structure does NOT.

1. approach="keyword" — Keyword-Optimized angle:
   - Hook uses opener pattern A or B, front-loading the primary search term naturally.
   - Section labels reuse search vocabulary ("Track your sleep", "Plan your day", "Edit photos on the go").
   - MUST include a "keywords" array with 5–8 lowercase search terms this variant optimizes for (e.g. "pomodoro timer", "focus app"). Real user-typed terms only.

2. approach="conversion" — Conversion-Focused angle:
   - Hook uses opener pattern A or C, naming the outcome the user gets.
   - Bullets are framed as benefits ("Block distractions before they break your flow") not features ("Distraction blocking").
   - Context paragraph shows fit ("Built for solo knowledge workers"), no fabricated stats.
   - Do NOT include "keywords".

3. approach="brand" — Brand-Led angle:
   - Hook is one confident sentence using pattern A. Less is more.
   - Body is shorter overall — aim 1200–1800 chars.
   - 3 sections, 3 bullets each.
   - Drop the context section if it would feel like padding.
   - Closing line is one short sentence.
   - Do NOT include "keywords".

Length targets (hard cap enforced server-side, but stay well under):
- title: aim 16–26 characters. Hard cap 30. Top apps median is 16. MUST be "Brand" alone OR "Brand: Descriptor" / "Brand - Descriptor" — NEVER comma-separated keyword lists ("App, Tracker, Planner" is wrong; "Notewise: AI Notes" is right). Title must end as a complete thought; no partial words ("Todaywise: Intelligent Daily" is wrong — Daily what?).
- ${platform === "android" ? "shortDesc: aim 65–78 characters. Hard cap 80. 11/19 top apps use ≥70 chars. Lead with a verb when possible (Stay, Make, Create, Listen…). MUST end as a complete clause — no dangling fragments." : "subtitle: aim 25–30 characters. Hard cap 30. Complete tagline, not cut off."}
- fullDesc: aim 2000–3000 chars for keyword/conversion, 1200–1800 for brand. Top-app median: 2539. NEVER push toward the 4000 cap — zero top apps do.

Voice rules (apply across all variants):
- Sound like a developer wrote it, not a marketing team. No hype.
- NEVER invent specific numbers (no "10,000 users", no fake ratings, no fabricated awards, no press names, no customer names).
- Match the requested tone consistently across all three variants. Tone definition: ${toneDefinition}
- The three variants must FEEL distinctly different on read, even though they share a skeleton — different opening words, different bullet phrasing, different closing.
- Repeat the brand name 3–8 times across the body. Heavy brand anchoring is a top-app pattern, not stuffing.

Return ONLY the structured object. No commentary.`;
}

// Second pass: the model critiques its own draft against the format spec, then returns improved variants.
// Falls back to the draft on failure; never makes output worse.
export function buildRefinePrompt(
  input: GeneratorInput,
  platform: Platform,
  draft: Array<{
    approach: "keyword" | "conversion" | "brand";
    title: string;
    shortDesc?: string;
    subtitle?: string;
    fullDesc: string;
    keywords?: string[];
  }>
): string {
  const formatRules = platform === "android" ? ANDROID_FORMAT : IOS_FORMAT;
  const toneDefinition = TONE_DEFINITIONS[input.tone];

  return `You are an ASO expert reviewing a first-draft store listing and improving it against patterns extracted from 20 top-tier Play Store apps.

App: ${input.appName} (${input.category}). Tone: ${input.tone} — ${toneDefinition}.

${formatRules}

${HOOK_PATTERNS}

${SKELETON}

DRAFT TO REVIEW (return three improved variants in the same order: keyword, conversion, brand):

${draft
  .map(
    (v, i) => `--- Variant ${i + 1}: approach="${v.approach}" ---
title: ${v.title}
${v.shortDesc !== undefined ? `shortDesc: ${v.shortDesc}` : ""}${v.subtitle !== undefined ? `subtitle: ${v.subtitle}` : ""}
${v.keywords ? `keywords: ${v.keywords.join(", ")}` : ""}
fullDesc:
${v.fullDesc}
`
  )
  .join("\n")}

CRITIQUE checklist (run silently; act on what's weak; LEAVE what's strong alone):
0. COMPLETENESS — read the title, shortDesc/subtitle, and closing line. Each must end as a complete thought. NO dangling fragments. Rewrite if anything ends on a partial word/phrase ("Daily" — daily what?), comma-stuffed keywords ("App, Tracker, Planner"), or trailing prepositions.
1. HOOK — does it use opener pattern A, B, or C? Does it contain the brand name? Is it 150–400 chars? Pain-question openers ("Tired of…?") are FORBIDDEN — zero top apps use them. Rewrite to "[Brand] is/lets/helps…" or "Use/Get/Explore [Brand]…" or "Whether you're [scenario]…".
2. SECTION SCAFFOLDING — body must be 3–7 sections, each as: Title-Cased label (NOT ALL-CAPS) → 3–5 bullets using • (U+2022). Wall-of-text or ALL-CAPS-header style is wrong by default. Rewrite labels into Title-Case if currently in caps.
3. BULLET QUALITY — every bullet must be verb-led + benefit/scope (8–18 words). Bare feature nouns ("• End-to-end encryption") are wrong. Rewrite as "• Encrypts every message end-to-end, so only you and the recipient see it.".
4. BULLET CHARACTER — every bullet must use • (U+2022). If draft uses ▶, ◉, –, *, or >, swap to •.
5. PARAGRAPH LENGTH — no paragraph longer than 4 sentences. Split into bullets if it runs long.
6. EMOJI/EXCLAMATION DISCIPLINE — emoji ≤2 across the whole description (default 0); exclamation marks ≤2. Strip excess.
7. CLOSING — must be a soft sign-off or sub-CTA. FORBIDDEN: "Download now", "Get started today", "Available on Google Play/App Store", "Click below". Rewrite as a single short sentence echoing the hook OR naming a concrete moment of use.
8. FABRICATIONS — strip made-up numbers, ratings, awards, customer names, press mentions. Replace with generic true context ("for solo writers", "no ads, no trackers") or remove.
9. BRAND ANCHORING — brand name should appear 3–8 times across the body. Add it to section labels or bullet lead-ins if too sparse; remove if it appears >10 times.
10. LENGTH — keyword/conversion 2000–3000 chars (top-app median 2539); brand 1200–1800. Trim "comprehensive solution", "seamless experience", filler adjectives. NEVER push toward 4000.
11. TONE CONSISTENCY — variant sounds like the tone definition end-to-end. No corporate-speak in casual, no hype in professional.
12. DIFFERENTIATION — the three variants must read distinctly different (different opening words, different bullet phrasing, different closing). If two overlap, push brand toward terser, conversion toward more vivid pain/outcome.
13. VARIANT CONSTRAINTS — Variant 1 (keyword): MUST include "keywords" array (5–8 lowercase search terms). Variant 2 (conversion) and 3 (brand): NO "keywords" field.

Return THREE improved variants in the structured object. Same order. If a variant is already strong on a check, leave it alone. Only rewrite what's weak.

Return ONLY the structured object. No commentary.`;
}
