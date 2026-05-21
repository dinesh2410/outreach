import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json();
    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json({ error: "keyword required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google AI API key not configured" },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(
      `A user is setting up a Reddit monitoring tracker with the keyword "${keyword}". They want to catch every relevant Reddit post about this topic.

Think step by step:
1. What does "${keyword}" most likely refer to? Consider the most common real-world meaning.
2. What other words and short phrases would appear IN THE SAME Reddit posts that contain "${keyword}"?
3. What would someone searching for this topic also type on Reddit?

Suggest 8-10 keywords that would help catch MORE Reddit posts on the same topic. These should be phrases that Reddit users actually write in their posts and comments about this subject.

Good example: for "closed testing" → "beta testers needed", "google play console", "20 testers", "internal testing", "opt-in link", "testing track"
Bad example: for "closed testing" → "software testing", "test automation", "QA engineer" (these are a different topic entirely)

Return ONLY a JSON array of strings. No explanation.`,
    );

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse suggestions" }, { status: 500 });
    }

    const suggestions: string[] = JSON.parse(jsonMatch[0]);
    const kwLower = keyword.toLowerCase();
    const cleaned = suggestions
      .map((s) => s.trim().toLowerCase())
      .filter((s) => {
        if (s.length === 0 || s.length > 60) return false;
        if (s === kwLower) return false;
        // Remove suggestions that just wrap the keyword in filler words
        // e.g. "need 12 testers", "looking for 12 testers"
        if (s.includes(kwLower)) return false;
        return true;
      })
      .slice(0, 10);

    return NextResponse.json({ suggestions: cleaned });
  } catch (err) {
    console.error("[buzz/suggest-keywords] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Suggestion failed" },
      { status: 500 },
    );
  }
}
