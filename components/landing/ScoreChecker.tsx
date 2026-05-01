"use client";

import { useState } from "react";
import { calculateScore } from "@/lib/score";
import { ScoreResult } from "@/lib/types";
import { Search, Check, X, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ScoreChecker({ standalone = false }: { standalone?: boolean }) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  function handleScan() {
    if (!url.trim()) return;
    setScanning(true);
    setResult(null);

    setTimeout(() => {
      setResult(calculateScore(url));
      setScanning(false);
    }, 1800);
  }

  const circumference = 2 * Math.PI * 54;
  const dashOffset = result
    ? circumference - (result.score / 100) * circumference
    : circumference;

  const gradeColor = result && result.score >= 65
    ? "text-green"
    : result && result.score >= 50
      ? "text-gold"
      : "text-ink";

  return (
    <section
      id="score-checker"
      className={standalone ? "" : "py-24 md:py-32"}
    >
      <div className="max-w-6xl mx-auto px-6">
        {!standalone && (
          <div className="text-center mb-12">
            <p className="text-xs text-ink-faint uppercase tracking-[0.2em] mb-4">
              Free tool
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
              Check your listing score.
            </h2>
            <p className="mt-4 text-ink-muted max-w-lg mx-auto">
              Paste your app store URL and get an instant audit with actionable fixes.
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Paste your Play Store or App Store URL"
                className="w-full pl-11 pr-4 py-3.5 rounded-full bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/10 transition-colors"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !url.trim()}
              className="px-6 py-3.5 bg-ink text-white font-medium rounded-full hover:bg-accent-soft transition-colors disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </div>

          {scanning && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-ink" style={{ animation: "typingDot 1.4s infinite 0s" }} />
                  <span className="w-2 h-2 rounded-full bg-ink" style={{ animation: "typingDot 1.4s infinite 0.2s" }} />
                  <span className="w-2 h-2 rounded-full bg-ink" style={{ animation: "typingDot 1.4s infinite 0.4s" }} />
                </div>
                Analyzing your listing...
              </div>
            </div>
          )}

          {result && !scanning && (
            <div className="mt-8 animate-fade-up">
              <div className="bg-surface rounded-3xl border border-line-soft p-8">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-line-soft"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className={gradeColor}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-semibold animate-score-count ${gradeColor}`}>
                        {result.score}
                      </span>
                      <span className="text-xs text-ink-faint">
                        Grade {result.grade}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    {result.checks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-start gap-3 text-sm"
                      >
                        {check.passed ? (
                          <Check size={16} className="text-green shrink-0 mt-0.5" />
                        ) : (
                          <X size={16} className="text-ink shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-medium text-ink`}>{check.label}</p>
                          <p className="text-ink-muted text-xs mt-0.5">
                            {check.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-line-soft text-center">
                  <Link href="/auth" className="btn-pill-dark">
                    Fix my listing
                    <span className="arrow-circle">
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
