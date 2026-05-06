"use client";

import { useState } from "react";
import { ArrowRight, Sparkles, SkipForward } from "lucide-react";
import type { ClarifyingQuestion, ClarifyingAnswer } from "@/lib/types";

interface Props {
  questions: ClarifyingQuestion[];
  onContinue: (answers: ClarifyingAnswer[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function ClarifyingState({ questions, onContinue, onSkip, onBack }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleContinue() {
    const filled: ClarifyingAnswer[] = questions
      .map((q) => ({
        id: q.id,
        question: q.question,
        answer: (answers[q.id] ?? "").trim(),
      }))
      .filter((a) => a.answer.length > 0);
    onContinue(filled);
  }

  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-accent" />
        <span className="text-sm font-medium text-accent">Three quick questions</span>
      </div>
      <h1 className="text-3xl font-semibold text-ink mb-2">
        Help me write copy that's actually about your app
      </h1>
      <p className="text-ink-muted mb-8">
        Answer in your own words — the more specific you are, the sharper the generated copy will be.
      </p>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="p-5 rounded-2xl bg-surface border border-line"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-ink font-medium">{q.question}</p>
                <p className="text-xs text-ink-faint mt-1">{q.why}</p>
              </div>
            </div>

            <div className="ml-9">
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={3}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-ink-muted border border-line hover:border-ink-faint hover:text-ink transition-colors"
          >
            <SkipForward size={14} />
            Skip all
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors"
          >
            Generate{answeredCount > 0 ? ` with ${answeredCount} answer${answeredCount === 1 ? "" : "s"}` : ""}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
