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
import { buildPrompt, buildRefinePrompt } from "./prompt";
import { fetchStoreListing, type StoreListing } from "@/lib/store-scraper";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_SCHEMA_RETRIES = 1;

type DraftVariants = z.infer<typeof PlatformSchema>["variants"];

async function generateWithRetry(
  input: GeneratorInput,
  platform: Platform,
  currentListing: StoreListing | null
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_SCHEMA_RETRIES; attempt++) {
    try {
      return await generateObject({
        model: google("gemini-2.5-flash"),
        schema: PlatformSchema,
        prompt: buildPrompt(input, platform, currentListing),
      });
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
  draft: DraftVariants
): Promise<DraftVariants> {
  if (process.env.OUTREACH_REFINE === "off") return draft;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: PlatformSchema,
      prompt: buildRefinePrompt(input, platform, draft),
    });
    if (
      object.variants.length === 3 &&
      object.variants[0].approach === "keyword" &&
      object.variants[1].approach === "conversion" &&
      object.variants[2].approach === "brand"
    ) {
      return object.variants;
    }
    console.warn("[/api/generate] refine returned malformed variants, using draft");
    return draft;
  } catch (err) {
    console.warn("[/api/generate] refine failed, using draft:", err instanceof Error ? err.message : err);
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

  try {
    for (const platform of input.platform) {
      const { object } = await generateWithRetry(input, platform, currentListing);
      const refined = await refineDraft(input, platform, object.variants);

      const variants: Variant[] = refined.map((v, i) => ({
        id: `${platform}-${v.approach}-${Date.now()}-${i}`,
        label: APPROACH_LABEL[v.approach],
        approach: v.approach,
        title: cleanTitle(truncateClean(v.title, PLATFORM_LIMITS.title)),
        shortDesc:
          platform === "android" && v.shortDesc
            ? ensureCompleteSentence(truncateClean(v.shortDesc, PLATFORM_LIMITS.shortDesc))
            : undefined,
        subtitle:
          platform === "ios" && v.subtitle
            ? ensureCompleteSentence(truncateClean(v.subtitle, PLATFORM_LIMITS.subtitle))
            : undefined,
        fullDesc: truncateClean(v.fullDesc, PLATFORM_LIMITS.fullDesc),
        keywords: v.approach === "keyword" ? v.keywords : undefined,
      }));

      if (platform === "android") result.android = variants;
      else result.ios = variants;
    }

    return Response.json(result);
  } catch (err) {
    console.error("[/api/generate] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
