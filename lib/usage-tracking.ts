// Shared usage-tracking helpers for any API route that calls Gemini via
// the AI SDK. /api/generate, /api/clarify, /api/reddit all use this so the
// admin dashboard can see total cost across the whole product, not just
// the generator.
//
// Every route follows the same pattern:
//   const usageLog: CallUsage[] = [];
//   const res = await generateObject({ ... });
//   usageLog.push(readUsage("stage-name", res));
//   ...
//   const summary = summarizeUsage(usageLog);
//   return Response.json({ ...payload, usage: summary });
//
// The client then persists the usage record via recordUsageForUser so it
// shows up in /admin/usage.

import type { UsageCall } from "./types";

// Gemini 2.5 Flash list pricing (USD per 1M tokens). Overrideable via env
// in case Google updates the price sheet.
export const GEMINI_FLASH_PRICE_INPUT_PER_M = Number(
  process.env.GEMINI_FLASH_INPUT_PRICE ?? 0.30
);
export const GEMINI_FLASH_PRICE_OUTPUT_PER_M = Number(
  process.env.GEMINI_FLASH_OUTPUT_PRICE ?? 2.50
);

export function costOf(u: { inputTokens: number; outputTokens: number }): number {
  return (
    (u.inputTokens / 1_000_000) * GEMINI_FLASH_PRICE_INPUT_PER_M +
    (u.outputTokens / 1_000_000) * GEMINI_FLASH_PRICE_OUTPUT_PER_M
  );
}

// Pull token counts from a generateObject/generateText response. Tolerates
// missing fields — older AI SDK responses sometimes only populate some of
// the three counters.
export function readUsage(
  stage: string,
  res: { usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }
): UsageCall {
  const u = res.usage ?? {};
  const input = u.inputTokens ?? 0;
  const output = u.outputTokens ?? 0;
  return {
    stage,
    inputTokens: input,
    outputTokens: output,
    totalTokens: u.totalTokens ?? input + output,
  };
}

export interface UsageSummary {
  calls: UsageCall[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  elapsedMs: number;
}

export function summarizeUsage(usageLog: UsageCall[], elapsedMs: number): UsageSummary {
  const totalIn = usageLog.reduce((s, u) => s + u.inputTokens, 0);
  const totalOut = usageLog.reduce((s, u) => s + u.outputTokens, 0);
  return {
    calls: usageLog,
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
    totalTokens: totalIn + totalOut,
    estimatedCostUsd: Number(costOf({ inputTokens: totalIn, outputTokens: totalOut }).toFixed(6)),
    elapsedMs,
  };
}

// Console one-liner for server logs. Useful when debugging which stage of
// a multi-call route is driving cost.
export function logUsageSummary(routeId: string, summary: UsageSummary): void {
  console.log(
    `[${routeId}] usage calls=${summary.calls.length} in=${summary.totalInputTokens} out=${summary.totalOutputTokens} cost=$${summary.estimatedCostUsd.toFixed(5)} time=${(summary.elapsedMs / 1000).toFixed(1)}s — ${summary.calls.map((c) => `${c.stage}:${c.inputTokens}+${c.outputTokens}`).join(", ")}`
  );
}
