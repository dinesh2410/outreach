"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Sparkles, SkipForward, Search, AlertTriangle, X } from "@/components/shared/Icon";
import type { ClarifyingQuestion, ClarifyingAnswer, KeywordCandidates } from "@/lib/types";

interface Props {
  questions: ClarifyingQuestion[];
  keywordCandidates?: KeywordCandidates;
  onContinue: (payload: {
    answers: ClarifyingAnswer[];
    primaryKeyword?: string;
    secondaryKeyword?: string;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
}

type Selection =
  | { mode: "candidate"; value: string }
  | { mode: "other"; value: string }
  | { mode: "none" };

function resolveSelection(s: Selection): string | undefined {
  if (s.mode === "candidate") return s.value.trim() || undefined;
  if (s.mode === "other") return s.value.trim() || undefined;
  return undefined;
}

export function ClarifyingState({
  questions,
  keywordCandidates,
  onContinue,
  onSkip,
  onBack,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [primary, setPrimary] = useState<Selection>({ mode: "none" });
  const [secondary, setSecondary] = useState<Selection>({ mode: "none" });
  const [warningOpen, setWarningOpen] = useState<"skip" | "generate" | null>(null);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function buildPayload() {
    const filled: ClarifyingAnswer[] = questions
      .map((q) => ({
        id: q.id,
        question: q.question,
        answer: (answers[q.id] ?? "").trim(),
      }))
      .filter((a) => a.answer.length > 0);
    return {
      answers: filled,
      primaryKeyword: resolveSelection(primary),
      secondaryKeyword: resolveSelection(secondary),
    };
  }

  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const primaryChosen = resolveSelection(primary);
  const secondaryChosen = resolveSelection(secondary);
  const keywordCount = (primaryChosen ? 1 : 0) + (secondaryChosen ? 1 : 0);
  const totalSignals = answeredCount + keywordCount;

  function handleContinue() {
    if (totalSignals === 0) {
      setWarningOpen("generate");
      return;
    }
    onContinue(buildPayload());
  }

  function handleSkipClick() {
    setWarningOpen("skip");
  }

  function proceedAnyway() {
    if (warningOpen === "skip") {
      onSkip();
    } else {
      onContinue(buildPayload());
    }
    setWarningOpen(null);
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className="text-accent" />
        <span className="text-sm font-medium text-accent">A few quick details</span>
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

        {keywordCandidates && (
          <div className="p-5 rounded-2xl bg-surface border border-line">
            <div className="flex items-start gap-3 mb-4">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                {questions.length + 1}
              </span>
              <div className="flex-1">
                <p className="text-ink font-medium flex items-center gap-2">
                  <Search size={14} className="text-ink-muted" />
                  Confirm your primary and secondary keywords
                </p>
                <p className="text-xs text-ink-faint mt-1">
                  Pick the search term users would type to find your app, or enter your own. Used to front-load the title and place keywords in the first sentence + hook.
                </p>
              </div>
            </div>

            <div className="ml-9 space-y-5">
              <KeywordPicker
                label="Primary keyword"
                description="The single search term you want to rank for most."
                candidates={keywordCandidates.primary}
                selection={primary}
                onSelect={setPrimary}
              />
              <KeywordPicker
                label="Secondary keyword"
                description="A related concept that should also appear in the long description."
                candidates={keywordCandidates.secondary}
                selection={secondary}
                onSelect={setSecondary}
              />
            </div>
          </div>
        )}
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
            onClick={handleSkipClick}
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
            Generate
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {warningOpen && (
        <SkipWarning
          mode={warningOpen}
          onProceed={proceedAnyway}
          onCancel={() => setWarningOpen(null)}
        />
      )}
    </div>
  );
}

function SkipWarning({
  mode,
  onProceed,
  onCancel,
}: {
  mode: "skip" | "generate";
  onProceed: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll while modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  if (!mounted) return null;

  const title =
    mode === "skip" ? "Skip the questions?" : "Generate without any details?";

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md bg-cream border border-line rounded-3xl shadow-2xl p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-ink hover:bg-surface transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3 mb-4 pr-8">
          <div className="shrink-0 w-10 h-10 rounded-2xl bg-warn/10 text-warn flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="text-sm text-ink-muted mt-1">
              These questions and the keyword choices directly shape the quality of the generated listing. Skipping them means the AI works only from the brief and may produce generic copy.
            </p>
          </div>
        </div>

        <ul className="text-xs text-ink-muted space-y-1.5 mb-6">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Specific answers let the AI write copy that's actually about your app.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">•</span>
            <span>Confirmed keywords get front-loaded in the title and short description for indexing.</span>
          </li>
        </ul>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors"
          >
            Go back and answer
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-ink bg-surface border border-line hover:border-warn hover:text-warn transition-colors"
          >
            Proceed anyway
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface KeywordPickerProps {
  label: string;
  description: string;
  candidates: string[];
  selection: Selection;
  onSelect: (s: Selection) => void;
}

function KeywordPicker({ label, description, candidates, selection, onSelect }: KeywordPickerProps) {
  const isOther = selection.mode === "other";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-faint">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {candidates.map((kw) => {
          const active = selection.mode === "candidate" && selection.value === kw;
          return (
            <button
              key={kw}
              type="button"
              onClick={() => onSelect({ mode: "candidate", value: kw })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-accent text-white border-accent"
                  : "bg-cream text-ink-muted border-line hover:border-ink-faint hover:text-ink"
              }`}
            >
              {kw}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onSelect(
              isOther
                ? { mode: "none" }
                : { mode: "other", value: "" }
            )
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            isOther
              ? "bg-accent text-white border-accent"
              : "bg-cream text-ink-muted border-line hover:border-ink-faint hover:text-ink"
          }`}
        >
          Other…
        </button>
      </div>
      {isOther && (
        <input
          autoFocus
          type="text"
          value={selection.value}
          onChange={(e) => onSelect({ mode: "other", value: e.target.value })}
          placeholder="Type your keyword (e.g. focus timer)"
          className="mt-2 w-full px-4 py-2.5 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
        />
      )}
    </div>
  );
}
