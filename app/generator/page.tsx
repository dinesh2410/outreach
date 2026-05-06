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
} from "@/lib/types";
import { generateVariants } from "@/lib/generate";
import { fetchClarifyingQuestions } from "@/lib/clarify";
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

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleStart(input: GenInput) {
    setPendingInput(input);
    setStage("loading-questions");
    try {
      const qs = await fetchClarifyingQuestions(input);
      setQuestions(qs);
      setStage("clarifying");
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.push(message);
      setStage("input");
    }
  }

  function handleClarifyContinue(answers: ClarifyingAnswer[]) {
    if (!pendingInput) return;
    runGeneration({ ...pendingInput, clarifications: answers });
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
  }

  const isResults = stage === "results" && result;
  return (
    <AppShell
      title={isResults ? result.input.appName : "ASO Generator"}
      description={isResults ? "Review, edit, and save your variants." : "Three angle variants per platform — generated from one brief."}
    >
      {stage === "input" && <GeneratorInputForm onGenerate={handleStart} />}
      {stage === "loading-questions" && <GeneratingState />}
      {stage === "clarifying" && (
        <ClarifyingState
          questions={questions}
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
