import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const KeywordExtractionSchema = z.object({
  primary: z
    .string()
    .describe(
      "The single best primary keyword — a 1-3 word lowercase search query a real user would type into the Play Store or App Store to find this type of app (e.g. 'habit tracker', 'budget planner', 'cloud storage', 'photo editor'). Must be a generic functional descriptor, NOT the brand name."
    ),
  secondary: z
    .string()
    .describe(
      "A closely related 1-3 word lowercase search term that supports the primary (e.g. for 'habit tracker': 'daily routine'; for 'cloud storage': 'file sharing'). Must differ from the primary."
    ),
});

export interface ExtractedKeywords {
  primary: string;
  secondary: string;
}

export async function extractPrimaryKeyword(listing: {
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
  genre?: string;
}): Promise<ExtractedKeywords | null> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;

  const title = listing.title?.trim() ?? "";
  const shortDesc = (listing.shortDesc ?? listing.subtitle ?? "").trim();
  const genre = listing.genre?.trim() ?? "";

  if (!title && !shortDesc && !listing.fullDesc) return null;

  const descPreview = listing.fullDesc
    ? listing.fullDesc.slice(0, 1200)
    : "";

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: KeywordExtractionSchema,
      prompt: `You are an ASO (App Store Optimization) keyword analyst. Given a live store listing, identify the PRIMARY keyword this app should rank for.

The primary keyword is the single most common search query a real user would type into Google Play or the App Store to find THIS TYPE of app. It must be:
- A generic functional descriptor (e.g. "cloud storage", "habit tracker", "photo editor", "budget planner", "meditation app")
- NOT the brand name, developer name, or any part of them
- NOT a URL, protocol, or technical term (no "https", "www", "com")
- MUST NOT contain any numbers or digits (no "12 testers", "40 000 developers")
- MUST NOT include statistics, counts, or metrics from the description
- Lowercase, 1-3 words, letters only (plus spaces between words)
- The kind of phrase that appears in store search autocomplete
- Think: what would a user searching for this type of app literally type?

Listing data:
Title: ${title}
${genre ? `Category: ${genre}` : ""}
${shortDesc ? `Short description: ${shortDesc}` : ""}
${descPreview ? `Description (first 1200 chars):\n${descPreview}` : ""}

Return the primary keyword and one supporting secondary keyword.`,
    });

    return {
      primary: object.primary.toLowerCase().trim(),
      secondary: object.secondary.toLowerCase().trim(),
    };
  } catch (err) {
    console.error("[extractPrimaryKeyword] LLM call failed:", err);
    return null;
  }
}
