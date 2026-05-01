"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { GeneratorInput as GenInput, GenerationResult } from "@/lib/types";
import { GeneratorInputForm } from "@/components/generator/GeneratorInputForm";
import { GeneratingState } from "@/components/generator/GeneratingState";
import { ResultsState } from "@/components/generator/ResultsState";

type Stage = "input" | "generating" | "results";

export default function GeneratorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    if (!user) router.push("/auth");
  }, [user, router]);

  if (!user) return null;

  function handleGenerate(input: GenInput) {
    setStage("generating");

    // Import dynamically to keep the swap easy
    import("@/lib/generate").then(({ generateVariants }) => {
      setTimeout(() => {
        const gen = generateVariants(input);
        setResult(gen);
        setStage("results");
      }, 2400);
    });
  }

  function handleReset() {
    setStage("input");
    setResult(null);
  }

  return (
    <>
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-12">
        {stage === "input" && <GeneratorInputForm onGenerate={handleGenerate} />}
        {stage === "generating" && <GeneratingState />}
        {stage === "results" && result && (
          <ResultsState result={result} onReset={handleReset} />
        )}
      </main>
    </>
  );
}
