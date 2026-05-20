"use client";

import { useEffect, useState } from "react";
import { Check } from "@/components/shared/Icon";

const STEPS = [
  "Reading your inputs",
  "Considering your audience",
  "Drafting the listing",
  "Tightening character counts",
  "Polishing the draft",
];

export function GeneratingState() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 480);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto text-center py-24 animate-fade-up">
      <div className="inline-flex items-center gap-2 mb-8">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full bg-accent"
            style={{ animation: "typingDot 1.4s infinite 0s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-accent"
            style={{ animation: "typingDot 1.4s infinite 0.2s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-accent"
            style={{ animation: "typingDot 1.4s infinite 0.4s" }}
          />
        </div>
        <span className="text-sm font-medium text-ink-muted">Generating...</span>
      </div>

      <div className="space-y-3 text-left">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
              i <= active
                ? "bg-surface border border-line"
                : "opacity-30"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                i < active
                  ? "bg-green/10 text-green"
                  : i === active
                    ? "bg-accent/10 text-accent"
                    : "bg-line-soft text-ink-faint"
              }`}
            >
              {i < active ? (
                <Check size={14} />
              ) : i === active ? (
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
              ) : null}
            </div>
            <span
              className={`text-sm ${
                i <= active ? "text-ink font-medium" : "text-ink-faint"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
