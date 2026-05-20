import { z } from "zod";

export const ClarifyingQuestionSchema = z.object({
  id: z
    .string()
    .describe("Short stable id, lowercase kebab-case (e.g. 'first-five-minutes')."),
  question: z
    .string()
    .describe("The question shown to the user. Specific to THIS app. Direct, ≤180 chars, no preamble."),
  why: z
    .string()
    .describe("One short sentence explaining how the answer changes the listing copy."),
});

export const KeywordCandidatesSchema = z.object({
  primary: z
    .array(z.string())
    .length(4)
    .describe("Exactly 4 candidate PRIMARY keywords. Lowercase, 1-3 words each, the kind of search query a user would type into the store to find this app (e.g. 'habit tracker', 'budget planner'). Order by likelihood of being the right choice — best first."),
  secondary: z
    .array(z.string())
    .length(4)
    .describe("Exactly 4 candidate SECONDARY keywords. Lowercase, 1-3 words each, closely related concepts that should support the primary (e.g. for 'habit tracker': 'daily routine', 'streak counter', 'goal tracker', 'reminder app'). Must NOT duplicate any primary candidate."),
});

export const ClarifySchema = z.object({
  questions: z
    .array(ClarifyingQuestionSchema)
    .length(3)
    .describe("Exactly 3 questions. Together their answers should paint a complete picture of the app."),
  keywordCandidates: KeywordCandidatesSchema.describe(
    "Suggested primary + secondary keyword candidates the developer can confirm or override."
  ),
});
