import { z } from "zod";
import type { Variant } from "@/lib/types";

// Zod schema returned by Gemini for a single platform.
// Schema limits intentionally allow a small overrun so the model isn't rejected
// for a 4-char miss on shortDesc (Gemini consistently hits 84-90 chars in English).
// The route handler truncates to the real platform limits cleanly at word boundaries.

export const VariantSchema = z.object({
  approach: z.literal("keyword"),
  title: z
    .string()
    .min(1)
    .max(45)
    .describe("Store title — aim for ≤30 characters. Real platform cap is 30."),
  shortDesc: z
    .string()
    .max(120)
    .optional()
    .describe(
      "Android short description — aim for 70-80 characters. Real platform cap is 80."
    ),
  subtitle: z
    .string()
    .max(45)
    .optional()
    .describe("iOS subtitle — aim for ≤30 characters. Real platform cap is 30."),
  fullDesc: z
    .string()
    .min(1)
    .max(4500)
    .describe(
      "Full app description — aim for 2500-3300 characters. Real platform cap is 4000."
    ),
  keywords: z
    .array(z.string().min(2).max(40))
    .min(5)
    .max(8)
    .describe(
      "5-8 high-intent search terms this listing is optimizing for. Lowercase, single words or short phrases (≤40 chars each)."
    ),
});

export const PlatformSchema = z.object({
  variants: z
    .array(VariantSchema)
    .length(1)
    .describe("Exactly one keyword-optimized variant."),
});

export const APPROACH_LABEL: Record<Variant["approach"], string> = {
  keyword: "Keyword-Optimized",
};

// Real platform limits — used by the route handler to truncate cleanly.
export const PLATFORM_LIMITS = {
  title: 30,
  shortDesc: 80,
  subtitle: 30,
  fullDesc: 4000,
} as const;
