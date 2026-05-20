"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import {
  GeneratorInput as GenInput,
  GenerationResult,
  ClarifyingQuestion,
  ClarifyingAnswer,
  KeywordCandidates,
} from "@/lib/types";
import { generateVariants } from "@/lib/generate";
import { fetchClarifyingQuestions } from "@/lib/clarify";
import { recordUsageForUser } from "@/lib/firestore";
import type { UsageRecord } from "@/lib/types";
import { GeneratorInputForm } from "@/components/generator/GeneratorInputForm";
import { GeneratingState } from "@/components/generator/GeneratingState";
import { ClarifyingState } from "@/components/generator/ClarifyingState";
import { ResultsState } from "@/components/generator/ResultsState";

type Stage = "input" | "loading-questions" | "clarifying" | "generating" | "results";

export default function GeneratorPage() {
  const { user, loading, recordHistory } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("input");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [pendingInput, setPendingInput] = useState<GenInput | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [keywordCandidates, setKeywordCandidates] = useState<KeywordCandidates | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleStart(input: GenInput) {
    setPendingInput(input);
    setStage("loading-questions");
    try {
      const { questions: qs, keywordCandidates: kw, usage } = await fetchClarifyingQuestions(input);
      setQuestions(qs);
      setKeywordCandidates(kw);
      setStage("clarifying");
      // Persist clarify usage so admin dashboard sees it. Failures are
      // silent — they shouldn't block the user from continuing.
      if (user && usage) {
        const record: UsageRecord = {
          id: `clar-${Date.now()}`,
          userId: user.id,
          userEmail: user.email,
          tool: "clarify",
          appName: input.appName,
          category: input.category,
          totalInputTokens: usage.totalInputTokens,
          totalOutputTokens: usage.totalOutputTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsd: usage.estimatedCostUsd,
          elapsedMs: usage.elapsedMs,
          calls: usage.calls,
          createdAt: new Date().toISOString(),
        };
        recordUsageForUser(user.id, record).catch((err) =>
          console.error("[generator] clarify usage persist failed:", err)
        );
      }
    } catch (err) {
      // If clarification fails, fall back to direct generation — don't block the user.
      const message = err instanceof Error ? err.message : "Could not load questions";
      toast.push(`${message} — generating without follow-up questions.`);
      runGeneration(input);
    }
  }

  async function runGeneration(input: GenInput) {
    setStage("generating");
    try {
      const gen = await generateVariants(input);
      setResult(gen);
      setStage("results");
      recordHistory(gen);
      // Fire-and-forget usage logging — failures shouldn't block the user
      // from seeing their generation. Admin dashboard reads from /users/*/usage.
      if (user && gen.usage) {
        const record: UsageRecord = {
          id: gen.id,
          userId: user.id,
          userEmail: user.email,
          tool: "generate",
          appName: input.appName,
          category: input.category,
          platforms: input.platform,
          totalInputTokens: gen.usage.totalInputTokens,
          totalOutputTokens: gen.usage.totalOutputTokens,
          totalTokens: gen.usage.totalTokens,
          estimatedCostUsd: gen.usage.estimatedCostUsd,
          elapsedMs: gen.usage.elapsedMs,
          calls: gen.usage.calls,
          createdAt: gen.createdAt,
        };
        recordUsageForUser(user.id, record).catch((err) =>
          console.error("[generator] usage persist failed:", err)
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.push(message);
      setStage("input");
    }
  }

  function handleClarifyContinue(payload: {
    answers: ClarifyingAnswer[];
    primaryKeyword?: string;
    secondaryKeyword?: string;
  }) {
    if (!pendingInput) return;
    runGeneration({
      ...pendingInput,
      clarifications: payload.answers,
      primaryKeyword: payload.primaryKeyword,
      secondaryKeyword: payload.secondaryKeyword,
    });
  }

  function handleClarifySkip() {
    if (!pendingInput) return;
    runGeneration(pendingInput);
  }

  function handleClarifyBack() {
    setStage("input");
  }

  function handleReset() {
    setStage("input");
    setResult(null);
    setPendingInput(null);
    setQuestions([]);
    setKeywordCandidates(undefined);
  }

  const isResults = stage === "results" && result;
  return (
    <AppShell
      eyebrow={isResults ? "Variants · Ready to review" : "Tools · ASO Generator"}
      title={isResults ? result.input.appName : "Ship a sharper listing"}
      description={isResults ? "Review, edit, and save the listing." : "One brief in, one keyword-optimized listing out."}
    >
      {stage === "input" && <GeneratorInputForm onGenerate={handleStart} />}
      {stage === "loading-questions" && <GeneratingState />}
      {stage === "clarifying" && (
        <ClarifyingState
          questions={questions}
          keywordCandidates={keywordCandidates}
          onContinue={handleClarifyContinue}
          onSkip={handleClarifySkip}
          onBack={handleClarifyBack}
        />
      )}
      {stage === "generating" && <GeneratingState />}
      {isResults && <ResultsState result={result} onReset={handleReset} />}
    </AppShell>
  );
}
