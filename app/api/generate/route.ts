import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { z } from "zod";
import type {
  GeneratorInput,
  GenerationResult,
  Variant,
  Platform,
} from "@/lib/types";
import { PlatformSchema, APPROACH_LABEL, PLATFORM_LIMITS } from "./schema";
import { buildPrompt, buildRefinePrompt, buildExpandPrompt } from "./prompt";
import { ASO } from "@/lib/aso-standards";
import { fetchStoreListing, type StoreListing } from "@/lib/store-scraper";
import { readUsage, summarizeUsage, logUsageSummary } from "@/lib/usage-tracking";
import type { UsageCall } from "@/lib/types";

// Hard floors for variant length. Anything below these is escalated through
// expandIfShort() — the model gets one more pass with an explicit "add a
// new section to reach floor" instruction.
const LENGTH_FLOORS = {
  keyword: { fullDesc: ASO.FULL_DESC_FLOOR, shortDesc: ASO.SHORT_DESC_MIN },
} as const;

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_SCHEMA_RETRIES = 1;

// Local alias so existing function signatures don't all need updating.
type CallUsage = UsageCall;

type DraftVariants = z.infer<typeof PlatformSchema>["variants"];

async function generateWithRetry(
  input: GeneratorInput,
  platform: Platform,
  currentListing: StoreListing | null,
  usageLog: CallUsage[]
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_SCHEMA_RETRIES; attempt++) {
    try {
      const res = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: PlatformSchema,
        prompt: buildPrompt(input, platform, currentListing),
      });
      usageLog.push(readUsage(`${platform}.draft${attempt > 0 ? `.retry${attempt}` : ""}`, res));
      return res;
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : "";
      if (!/schema|object/i.test(message)) throw err;
    }
  }
  throw lastErr;
}

async function refineDraft(
  input: GeneratorInput,
  platform: Platform,
  draft: DraftVariants,
  usageLog: CallUsage[]
): Promise<DraftVariants> {
  if (process.env.OUTREACH_REFINE === "off") return draft;

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PlatformSchema,
      prompt: buildRefinePrompt(input, platform, draft),
    });
    usageLog.push(readUsage(`${platform}.refine`, res));
    const { object } = res;
    if (object.variants.length === 1 && object.variants[0].approach === "keyword") {
      return object.variants;
    }
    console.warn("[/api/generate] refine returned malformed variants, using draft");
    return draft;
  } catch (err) {
    console.warn("[/api/generate] refine failed, using draft:", err instanceof Error ? err.message : err);
    return draft;
  }
}

// Identify variants whose fullDesc or shortDesc is below the per-variant
// floor. The model regularly anchors fullDesc to the lower bound of the
// requested band even when we tell it not to; this is the safety net that
// pushes short drafts back into the model with an explicit expand instruction.
function findShortVariants(
  draft: DraftVariants,
  platform: Platform
): Array<{ index: number; needFullExpand: boolean; needShortExpand: boolean }> {
  const out: Array<{ index: number; needFullExpand: boolean; needShortExpand: boolean }> = [];
  draft.forEach((v, i) => {
    const floor = LENGTH_FLOORS[v.approach];
    const needFullExpand = v.fullDesc.length < floor.fullDesc;
    const needShortExpand =
      platform === "android" &&
      typeof v.shortDesc === "string" &&
      v.shortDesc.length < floor.shortDesc;
    if (needFullExpand || needShortExpand) out.push({ index: i, needFullExpand, needShortExpand });
  });
  return out;
}

// One more LLM pass on any variants that came in under the floor. We send
// the WHOLE 3-variant draft back (model needs the full context) but flag
// the offenders with explicit minimums per-variant.
async function expandIfShort(
  input: GeneratorInput,
  platform: Platform,
  draft: DraftVariants,
  usageLog: CallUsage[]
): Promise<DraftVariants> {
  const shorts = findShortVariants(draft, platform);
  if (shorts.length === 0) return draft;

  console.log(
    `[/api/generate] ${shorts.length} variant(s) under floor on ${platform}; expanding…`,
    shorts.map((s) => `#${s.index + 1}=${draft[s.index].fullDesc.length}`).join(" ")
  );

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PlatformSchema,
      prompt: buildExpandPrompt(input, platform, draft, shorts),
    });
    usageLog.push(readUsage(`${platform}.expand`, res));
    const { object } = res;
    if (object.variants.length === 1 && object.variants[0].approach === "keyword") {
      // Take the longer fullDesc and the longer shortDesc separately
      // (the model sometimes grows one but truncates the other in the same pass).
      const draftV = draft[0];
      const v = object.variants[0];
      const fullDesc =
        v.fullDesc.length > draftV.fullDesc.length ? v.fullDesc : draftV.fullDesc;
      const shortDesc =
        (v.shortDesc?.length ?? 0) > (draftV.shortDesc?.length ?? 0)
          ? v.shortDesc
          : draftV.shortDesc;
      return [{ ...draftV, ...v, fullDesc, shortDesc }];
    }
    console.warn("[/api/generate] expand returned malformed variants, using draft");
    return draft;
  } catch (err) {
    console.warn(
      "[/api/generate] expand failed, using draft:",
      err instanceof Error ? err.message : err
    );
    return draft;
  }
}

// Strip any HTML tags / markdown emphasis the model may have leaked through, and
// normalize whitespace so the output is paste-ready into Play Console / App Store Connect:
// - no leading/trailing whitespace per line
// - exactly one blank line between sections (never two or three)
// - no leading/trailing whitespace on the whole text
function stripFormatting(text: string): string {
  return text
    .replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, "") // <b>, </b>, <h2>, <br/>, etc.
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** → bold
    .replace(/__([^_]+)__/g, "$1") // __bold__ → bold
    .split("\n")
    .map((line) => line.replace(/\s+$/, "")) // trim trailing whitespace per line
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // 3+ newlines → exactly one blank line
    .trim();
}

function truncateClean(text: string, limit: number): string {
  const cleaned = stripFormatting(text);
  if (cleaned.length <= limit) return cleaned;
  const slice = cleaned.slice(0, limit);
  // ALWAYS cut at a word/sentence boundary — never mid-word, regardless of how many chars we lose.
  // A title like "Todaywise: Intelligent Planning" (31) → "Todaywise: Intelligent" (22), not "Plannin" (broken).
  const lastSpace = slice.lastIndexOf(" ");
  const lastPunct = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(","), slice.lastIndexOf(";"));
  const boundary = Math.max(lastSpace, lastPunct);
  if (boundary > 0) {
    return slice.slice(0, boundary).trimEnd();
  }
  return slice.trimEnd();
}

// Ensures a short blurb ends as a complete thought. Three escalating fallbacks:
// (1) already ends with .!? → leave alone
// (2) has a period somewhere → trim to last period
// (3) has a comma in the second half → trim to last comma + period
// (4) nothing — append period (still grammatically dubious but at least has a terminator).
// We never want to paste a dangling fragment like "...and prioritize" or "...your day for focused".
function ensureCompleteSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]\s*$/.test(trimmed)) return trimmed;
  const lastTerm = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?")
  );
  if (lastTerm > 0) return trimmed.slice(0, lastTerm + 1).trim();
  const lastComma = trimmed.lastIndexOf(",");
  if (lastComma > Math.floor(trimmed.length * 0.5)) {
    return trimmed.slice(0, lastComma).trim() + ".";
  }
  return trimmed + ".";
}

// Titles never end with terminal punctuation, but they shouldn't trail off on punctuation
// junk either. Strip trailing &, -, —, –, , : ; from titles.
function cleanTitle(text: string): string {
  return text.trim().replace(/[\s&\-–—,:;]+$/, "").trim();
}

// Deterministic last-mile fallback for shortDesc. The keyword variant
// occasionally comes back with a 30-40 char short description even after
// the refine + expand passes — Gemini under-fills this field when it's
// focused on keyword density. When that happens we synthesize a clean short
// description from the variant's hook: take the first sentence, ensure it
// names what the app does, fit it into the 60–78 band. Same approach a
// human ASO writer would take if they ran out of time.
function synthesizeShortDescFromHook(fullDesc: string): string | null {
  if (!fullDesc) return null;
  // First sentence (ends at the first .!? or paragraph break).
  const firstSentence = (fullDesc.split(/[.!?]\s|\n/)[0] ?? "").trim();
  if (firstSentence.length < 30) return null;
  // Aim for 70 chars; truncate at a word boundary so we never end mid-word.
  const target = 78;
  if (firstSentence.length <= target) return ensureClauseEnding(firstSentence);
  const slice = firstSentence.slice(0, target);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = (lastSpace > 50 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return ensureClauseEnding(trimmed);
}

function ensureClauseEnding(text: string): string {
  const t = text.trim().replace(/[,;:]+$/, "");
  if (/[.!?]$/.test(t)) return t;
  return t + ".";
}

// Force the user's confirmed keywords into the keywords[] array so the UI
// reflects what the developer actually chose, even if the model drifted to a
// synonym. Primary becomes keywords[0]; secondary is appended if missing.
// We dedupe case-insensitively but preserve the model's original casing for
// keywords that weren't overridden.
function enforceUserKeywords(
  modelKeywords: string[] | undefined,
  primary: string | undefined,
  secondary: string | undefined
): string[] | undefined {
  if (!modelKeywords || modelKeywords.length === 0) {
    const seeded = [primary, secondary].filter(Boolean) as string[];
    return seeded.length ? seeded : undefined;
  }
  const trimmedPrimary = primary?.trim().toLowerCase();
  const trimmedSecondary = secondary?.trim().toLowerCase();
  const existing = modelKeywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  // Drop any existing entries that match (case-insensitive) the user's picks,
  // then re-add them in the right slots so they show up in the exact form
  // the user chose.
  const filtered = existing.filter((k) => {
    const lc = k.toLowerCase();
    if (trimmedPrimary && lc === trimmedPrimary) return false;
    if (trimmedSecondary && lc === trimmedSecondary) return false;
    return true;
  });

  const out: string[] = [];
  if (primary) out.push(primary);
  if (secondary) out.push(secondary);
  for (const k of filtered) {
    if (out.length >= 8) break;
    out.push(k);
  }
  return out;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local at the project root.",
      },
      { status: 500 }
    );
  }

  let input: GeneratorInput;
  try {
    input = (await req.json()) as GeneratorInput;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input?.appName?.trim() || !input?.features?.trim() || !input?.platform?.length) {
    return Response.json(
      { error: "Missing required fields: appName, features, platform." },
      { status: 400 }
    );
  }

  // If the developer provided a store URL, fetch the live listing once and reuse
  // it across both platforms + the refine pass. Failures are silent — the prompt
  // simply omits the "current listing" context.
  let currentListing: StoreListing | null = null;
  if (input.storeUrl) {
    currentListing = await fetchStoreListing(input.storeUrl);
  }

  const result: GenerationResult = {
    id: `gen-${Date.now()}`,
    input,
    createdAt: new Date().toISOString(),
  };

  const usageLog: CallUsage[] = [];
  const requestStart = Date.now();

  try {
    for (const platform of input.platform) {
      const { object } = await generateWithRetry(input, platform, currentListing, usageLog);
      const refined = await refineDraft(input, platform, object.variants, usageLog);
      const filled = await expandIfShort(input, platform, refined, usageLog);

      const variants: Variant[] = filled.map((v, i) => {
        const cleanedFull = truncateClean(v.fullDesc, PLATFORM_LIMITS.fullDesc);
        let cleanedShort: string | undefined;
        if (platform === "android") {
          cleanedShort = v.shortDesc
            ? ensureCompleteSentence(truncateClean(v.shortDesc, PLATFORM_LIMITS.shortDesc))
            : undefined;
          // Last-mile fallback — if Gemini under-filled the short description
          // (this happens on ~10% of keyword variants), synthesize one from
          // the fullDesc hook instead of shipping a half-empty field.
          if (!cleanedShort || cleanedShort.length < ASO.SHORT_DESC_MIN) {
            const synthesized = synthesizeShortDescFromHook(cleanedFull);
            if (synthesized && synthesized.length > (cleanedShort?.length ?? 0)) {
              cleanedShort = truncateClean(synthesized, PLATFORM_LIMITS.shortDesc);
            }
          }
        }
        return {
          id: `${platform}-${v.approach}-${Date.now()}-${i}`,
          label: APPROACH_LABEL[v.approach],
          approach: v.approach,
          title: cleanTitle(truncateClean(v.title, PLATFORM_LIMITS.title)),
          shortDesc: cleanedShort,
          subtitle:
            platform === "ios" && v.subtitle
              ? ensureCompleteSentence(truncateClean(v.subtitle, PLATFORM_LIMITS.subtitle))
              : undefined,
          fullDesc: cleanedFull,
          keywords: enforceUserKeywords(v.keywords, input.primaryKeyword, input.secondaryKeyword),
        };
      });

      if (platform === "android") result.android = variants;
      else result.ios = variants;
    }

    const summary = summarizeUsage(usageLog, Date.now() - requestStart);
    logUsageSummary(`/api/generate ${result.id}`, summary);

    return Response.json({ ...result, usage: summary });
  } catch (err) {
    console.error("[/api/generate] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
