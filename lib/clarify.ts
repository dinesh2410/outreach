import { GeneratorInput, ClarifyingQuestion } from "./types";

export async function fetchClarifyingQuestions(
  input: GeneratorInput
): Promise<ClarifyingQuestion[]> {
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

  const data = (await res.json()) as { questions: ClarifyingQuestion[] };
  return data.questions;
}
