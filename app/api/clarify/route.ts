import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { GeneratorInput } from "@/lib/types";
import { ClarifySchema } from "./schema";
import { buildClarifyPrompt } from "./prompt";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let input: GeneratorInput;
  try {
    input = (await req.json()) as GeneratorInput;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input?.appName?.trim() || !input?.features?.trim()) {
    return Response.json(
      { error: "Missing required fields: appName, features." },
      { status: 400 }
    );
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ClarifySchema,
      prompt: buildClarifyPrompt(input),
    });
    return Response.json(object);
  } catch (err) {
    console.error("[/api/clarify] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load questions" },
      { status: 500 }
    );
  }
}
