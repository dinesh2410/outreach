import { GeneratorInput, GenerationResult } from "./types";

export async function generateVariants(
  input: GeneratorInput
): Promise<GenerationResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = `Generation failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // body wasn't JSON — fall back to status message
    }
    throw new Error(message);
  }

  return (await res.json()) as GenerationResult;
}

export default generateVariants;
