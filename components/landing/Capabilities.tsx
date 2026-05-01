"use client";

import { MockThreeAngles } from "../mocks/MockThreeAngles";
import { MockCharCounter } from "../mocks/MockCharCounter";
import { MockCompareAll } from "../mocks/MockCompareAll";
import { MockKeywordExtraction } from "../mocks/MockKeywordExtraction";
import { useInView } from "@/lib/useInView";
import { Check } from "lucide-react";

const CAPABILITIES = [
  {
    title: "Three angles per generation",
    desc: "Every generation produces three distinct drafts: keyword-optimized, conversion-focused, and brand-led. Pick the one that fits, or mix and match.",
    checks: ["Keyword-Optimized (A)", "Conversion-Focused (B)", "Brand-Led (C)"],
    mock: <MockThreeAngles />,
    reverse: false,
  },
  {
    title: "Live character counters",
    desc: "Never publish over the limit. Every field shows a live count that turns yellow at 70% and red at 90%. Edit in place and watch the numbers move.",
    checks: ["Title: 30 chars", "Short description: 80 chars", "Full description: 4,000 chars"],
    mock: <MockCharCounter />,
    reverse: true,
  },
  {
    title: "Compare-all view",
    desc: "See all three variants side-by-side in a single view. Spot the differences at a glance and pick your winner without switching tabs.",
    checks: ["Side-by-side layout", "One-click switch to edit", "Visual diff scanning"],
    mock: <MockCompareAll />,
    reverse: false,
  },
  {
    title: "Keyword extraction",
    desc: "After every generation, see the top 10 keywords pulled from your drafts with frequency counts. Know exactly what's in your copy.",
    checks: ["Top 10 keywords", "Frequency counts", "Density indicator"],
    mock: <MockKeywordExtraction />,
    reverse: true,
  },
];

function CapabilityRow({
  title,
  desc,
  checks,
  mock,
  reverse,
  index,
}: {
  title: string;
  desc: string;
  checks: string[];
  mock: React.ReactNode;
  reverse: boolean;
  index: number;
}) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
        inView ? "animate-fade-up" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={reverse ? "lg:order-2" : ""}>
        <h3 className="text-3xl font-semibold text-ink mb-4 tracking-tight">
          {title}
        </h3>
        <p className="text-ink-muted leading-relaxed mb-6">{desc}</p>
        <ul className="space-y-2.5">
          {checks.map((check) => (
            <li key={check} className="flex items-center gap-2.5 text-sm text-ink">
              <span className="w-5 h-5 rounded-full bg-ink flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" strokeWidth={3} />
              </span>
              {check}
            </li>
          ))}
        </ul>
      </div>
      <div className={`pointer-events-none ${reverse ? "lg:order-1" : ""}`}>
        {mock}
      </div>
    </div>
  );
}

export function Capabilities() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <p className="text-xs text-ink-faint uppercase tracking-[0.2em] mb-4">
            Description tool
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            What&apos;s inside the description tool.
          </h2>
        </div>
        <div className="space-y-24">
          {CAPABILITIES.map((cap, i) => (
            <CapabilityRow key={cap.title} {...cap} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
