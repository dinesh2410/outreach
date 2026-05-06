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

export const ClarifySchema = z.object({
  questions: z
    .array(ClarifyingQuestionSchema)
    .length(3)
    .describe("Exactly 3 questions. Together their answers should paint a complete picture of the app."),
});
