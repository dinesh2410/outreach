import { GeneratorInput, ClarifyingQuestion, KeywordCandidates, UsageCall } from "./types";

export interface ClarifyResponse {
  questions: ClarifyingQuestion[];
  keywordCandidates: KeywordCandidates;
  usage?: {
    calls: UsageCall[];
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    elapsedMs: number;
  };
}

export async function fetchClarifyingQuestions(
  input: GeneratorInput
): Promise<ClarifyResponse> {
  const res = await fetch("/api/clarify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = `Could not load questions (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // body wasn't JSON
    }
    throw new Error(message);
  }

  const data = (await res.json()) as ClarifyResponse;
  return {
    questions: data.questions,
    keywordCandidates: data.keywordCandidates,
    usage: data.usage,
  };
}
