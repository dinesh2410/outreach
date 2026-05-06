import type { GeneratorInput, Platform } from "@/lib/types";
import type { StoreListing } from "@/lib/store-scraper";

// Prompt builder for the ASO description generator.
// The skeleton (hook → bullets → context → close) is consensus from authoritative ASO sources
// (Phiture, AppTweak, etc.). All three variants ride the same skeleton; only the angle differs.

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
- PLAIN TEXT ONLY. Do NOT emit any HTML tags (no <b>, no <i>, no <u>, no <h1>/<h2>/<h3>, no <br>). The output is shown to the user in a textarea and pasted directly into Play Console — what they see is what they paste. HTML tags would appear as visible "<b>...</b>" garbage characters.
- For emphasis use ALL CAPS or rephrasing. Do not use markdown asterisks (no **bold**) either.
- Emojis are allowed (the algorithm indexes them). Use ≤3 across the whole description and only when the tone permits.
- ASCII bullets ONLY: prefix bullet lines with "▶ ", "◉ ", or "– " (these are rendered characters, not markup).
- Section headers: ALL CAPS, on their own line, surrounded by blank lines. No header tags.
- Google Play indexes the FULL description. Place the primary keyword in the first 3 sentences. Aim for 2-3% density on the primary keyword across the whole description, 1-2% for secondary terms. Don't keyword-stuff.`;

const IOS_FORMAT = `Format rules — Apple App Store:
- NO HTML tags. NO URLs or hyperlinks. NO emojis.
- ASCII bullets only: prefix lines with "– ", "▶ ", or "◉ ".
- Section headers: ALL CAPS, on their own line, surrounded by blank lines.
- Apple does NOT index the description. Write for the human reader, not the algorithm. Save keyword density work for the title/subtitle.`;

const SKELETON = `fullDesc skeleton — every variant follows this exact section order:

1. HOOK (1-2 sentences, ~150-250 chars)
   - The single sharpest reason to install. Concrete, not abstract.
   - For 'keyword' variant: include the primary search term naturally here.
   - For 'conversion' variant: name the user's pain or the outcome they want.
   - For 'brand' variant: a single confident line that captures the app's stance.

2. (blank line)

3. WHAT IT DOES (one short paragraph, 2-4 sentences)
   - Plainly describe what the app does in user-facing terms (what they see/touch, not internal mechanics).
   - For 'conversion' variant: frame as the result the user gets ("Stop X. Start Y.").

4. (blank line)

5. ALL-CAPS HEADER then 3-6 bullet points
   - Use a header chosen from: "FEATURES", "KEY FEATURES", "WHAT'S INSIDE", "HOW IT WORKS". Match the variant's energy.
   - Each bullet: "▶ " + SHORT PHRASE IN CAPS (2-4 words) + " — " + 1 sentence detail in normal case (≤120 chars).
   - Use the SAME bullet character (▶) for every bullet within a variant. Do not mix ▶ with ◉ or – within one variant.
   - All bullets within a variant should be similar in length (within ~30 chars of each other) for clean visual rhythm.
   - Example: "▶ AI SCHEDULE OPTIMIZER — Generates a daily plan from your tasks in seconds."
   - For 'brand' variant: exactly 3 bullets, each terser (≤90 chars total per line).

6. (blank line)

7. ALL-CAPS HEADER then context paragraph (optional, 2-3 sentences)
   - Header chosen from: "WHO IT'S FOR", "BUILT BY", "BEHIND THE SCENES". Pick one and stick with it across all variants.
   - Use only generic, true context: "built by an indie developer", "for solo writers", "no ads, no trackers".
   - DO NOT invent: numbers of users, awards, ratings, press mentions, named customers, percentage stats.
   - Skip this section entirely for the 'brand' variant if it would feel like padding.

8. (blank line)

9. CLOSING LINE (exactly 1 sentence, ≤90 chars)
   - Specific to the app, not generic. Echo the hook OR name a concrete moment of use.
   - Good: "Open Todaywise tomorrow morning — your day will already be planned."
   - Good: "Try it on your next blank-Monday calendar."
   - Bad (do NOT write any of these): "Download now!", "Available on Google Play", "Get started today", "Experience the future of...", "[App] is available to support your needs."
   - The closing line MUST NOT mention the store name or the word "download" or "get started" or "available".`;

function buildCurrentListingBlock(listing: StoreListing | null): string {
  if (!listing) return "";
  const parts: string[] = [];
  if (listing.title) parts.push(`Current title: ${listing.title}`);
  if (listing.shortDesc) parts.push(`Current short description: ${listing.shortDesc}`);
  if (listing.subtitle) parts.push(`Current subtitle: ${listing.subtitle}`);
  if (listing.fullDesc) {
    // Truncate to keep the prompt manageable; the model only needs flavor + structure, not every word.
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

  return `You are an ASO (App Store Optimization) expert writing real store listings for an indie developer. You follow a consensus format used by high-converting listings.

App name: ${input.appName}
Category: ${input.category}
Key features: ${input.features}
${input.audience ? `Target audience: ${input.audience}` : ""}
Tone: ${input.tone} — ${toneDefinition}
${input.storeUrl ? `Existing store URL: ${input.storeUrl}` : ""}
${currentListingBlock}${clarifyBlock}
${platformBlock}

${formatRules}

${SKELETON}

Produce THREE variants. ALL THREE follow the skeleton above identically. The angle differs — the structure does NOT.

1. approach="keyword" — Keyword-Optimized angle:
   - Hook front-loads the primary search term + 1-2 secondary terms.
   - Bullet headers and opening lines reuse keywords naturally (2-3% density on primary, 1-2% on secondary).
   - MUST include a "keywords" array with 5-8 lowercase search terms this variant is optimizing for (e.g. "pomodoro timer", "focus app"). Pick terms a real user would type into store search.

2. approach="conversion" — Conversion-Focused angle:
   - Hook names the user's pain or the outcome they get.
   - Bullets are framed as benefits ("Block distractions before they break your flow") not features ("Distraction blocking").
   - Context section shows fit ("Built for solo knowledge workers"), no fabricated stats.
   - Do NOT include "keywords".

3. approach="brand" — Brand-Led angle:
   - Hook is a single confident line. Less is more.
   - Body is shorter overall — aim 1200-1800 chars (still uses the skeleton).
   - 3 bullets max. Drop the context section if it would feel like padding.
   - Closing line is one short sentence.
   - Do NOT include "keywords".

Length targets (the server enforces real platform caps):
- title: aim 25-30 characters. Hard cap 30. MUST be a complete name + complete descriptor — never end on a partial word or partial phrase. Each title should read as a finished thought.
  Bad (do NOT produce these): "Todaywise: Intelligent Daily" (no — "Daily" is a partial phrase), "FocusFlow: Pomodoro Timer &" (no — "&" hangs), "Notewise: AI-Powered" (no — "Powered" what?).
  Good: "Todaywise: AI Day Planner" (complete), "FocusFlow: Pomodoro Timer" (complete), "Notewise — AI Notes" (complete).
- ${platform === "android" ? "shortDesc: aim 65-78 characters. Hard cap 80. MUST end with a period or end as a complete phrase. Read it back to yourself — does it end mid-thought? If yes, rewrite shorter. Bad: 'Stop feeling overwhelmed. Todaywise brings clarity and focus to your daily' (ends on 'daily', incomplete). Good: 'Stop feeling overwhelmed. Todaywise brings clarity to your day.' (complete, fits)." : "subtitle: aim 25-30 characters. Hard cap 30. Must be a complete tagline, not cut off."}
- fullDesc: aim 1500-2500 characters for keyword/conversion variants, 1200-1800 for brand. Hard cap 4000. Front-load value in the first 200-300 chars (most users never tap "Read More").

Voice rules (apply across all variants):
- Sound like a developer wrote it, not a marketing team. No hype.
- Do NOT invent specific numbers (no "10,000 users", no fake ratings, no fabricated awards, no press names, no customer names).
- Match the requested tone consistently across all three variants. Tone definition: ${toneDefinition}
- The three variants must FEEL distinctly different on read, even though they share a skeleton — different opening words, different bullet phrasing, different closing.

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

  return `You are an ASO expert reviewing a first-draft store listing and improving it.

App: ${input.appName} (${input.category}). Tone: ${input.tone} — ${toneDefinition}.

${formatRules}

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
0. CRITICAL — completeness check. Read the title, the shortDesc/subtitle, and the closing line aloud. Does each one end as a complete thought? If a shortDesc ends without a period and the last word is a verb/preposition/adjective ("...and prioritize", "...to your daily", "...for focused") — REWRITE it shorter so it ends with a period as a complete sentence. If a title ends on a partial phrase ("Todaywise: Intelligent Daily" — Daily what?) — rewrite as a complete name + descriptor. Same for subtitles. NO dangling fragments.
1. Hook (first 1-2 sentences): is it concrete? Does it front-load the most install-worthy reason? For 'keyword', does it contain the primary search term naturally? For 'conversion', does it name the pain or outcome? Vague openers like "FocusFlow is a productivity app..." are weak.
2. Skeleton adherence: hook → "WHAT IT DOES" paragraph → ALL-CAPS header + 3-6 bullets → optional context section → closing line. Sections separated by blank lines. ASCII bullets (▶ / ◉ / – ).
3. Bullet phrasing per variant:
   - keyword: bullets reuse search terms naturally (not stuffed)
   - conversion: bullets framed as benefits ("Stop losing focus to notifications") not features ("Notification blocking")
   - brand: 3 bullets max, terser
4. Fabrications: any made-up numbers, ratings, awards, customer names, or press mentions? STRIP them — replace with generic true context ("for solo writers", "no ads, no trackers") or remove the section.
5. Tone consistency: does the variant sound like the tone definition above, end-to-end? Phrases that drift (corporate-speak in casual, hype in professional) — fix.
6. Closing line: neutral, not "Download now!" energy. One sentence.
7. Length: keyword/conversion 1500-2500 chars, brand 1200-1800 chars. Trim padding ("comprehensive solution", "seamless experience", filler adjectives) without losing meaning.
8. Differentiation: do the three variants feel distinctly different on read — different opening words, different bullet phrasing, different closing? If two variants overlap, push the brand variant toward terser, the conversion toward more vivid pain/outcome.
9. Variant constraints (must hold):
   - Variant 1: approach="keyword", MUST include "keywords" array (5-8 lowercase search terms).
   - Variant 2: approach="conversion", do NOT include "keywords".
   - Variant 3: approach="brand", do NOT include "keywords".

Return THREE improved variants in the structured object. Same order. If a variant is already strong on a check, leave that part alone. Only rewrite what's weak.

Return ONLY the structured object. No commentary.`;
}
