import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { readUsage, summarizeUsage, logUsageSummary } from "@/lib/usage-tracking";
import type { UsageCall } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ReplySchema = z.object({
  reply: z
    .string()
    .describe(
      "A helpful Reddit comment reply (100–300 chars). Conversational, not salesy. Mention the app naturally as something you found/built that solves their problem. Include the app name once. No links — Reddit auto-flags comments with links from new/low-karma accounts."
    ),
});

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: {
    postTitle?: string;
    postBody?: string;
    postSubreddit?: string;
    idea?: string;
    appName?: string;
    appUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postTitle = body.postTitle?.trim();
  if (!postTitle) {
    return Response.json({ error: "Missing postTitle" }, { status: 400 });
  }

  const postBody = (body.postBody ?? "").trim().slice(0, 500);
  const subreddit = body.postSubreddit ?? "";
  const idea = (body.idea ?? "").trim();
  const appName = (body.appName ?? "").trim();
  const appUrl = (body.appUrl ?? "").trim();

  const usageLog: UsageCall[] = [];
  const requestStart = Date.now();

  const prompt = `You are writing a Reddit comment reply. Someone posted in r/${subreddit}:

Title: ${postTitle}
${postBody ? `Body: ${postBody}` : ""}

${idea ? `The user's app idea: ${idea}` : ""}
${appName ? `The user's app: ${appName}` : ""}
${appUrl ? `App store link: ${appUrl}` : ""}

Write a SINGLE helpful reply that:
1. Acknowledges the poster's problem/question genuinely
2. ${appName ? `Mentions "${appName}" naturally as something that does exactly this` : "Suggests the user's app as a solution without being generic"}
3. ${appUrl ? `Includes the store link naturally at the end` : "Does NOT include any links — just the app name so they can search for it"}
4. Sounds like a real Reddit user, not a marketer
5. Is 2-4 sentences max. No bullet points, no formatting, no emojis
6. Does NOT start with "Hey!" or "Hi there!" — just jump into the answer
7. Does NOT say "I'm the developer" unless the app name is provided — frame it as a recommendation`;

  try {
    const res = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ReplySchema,
      prompt,
    });
    usageLog.push(readUsage("reddit-reply", res));

    const summary = summarizeUsage(usageLog, Date.now() - requestStart);
    logUsageSummary(`/api/reddit-reply`, summary);

    return Response.json({
      reply: res.object.reply,
      usage: summary,
    });
  } catch (err) {
    console.error("[/api/reddit-reply] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate reply" },
      { status: 500 }
    );
  }
}
