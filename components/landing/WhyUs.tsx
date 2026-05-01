"use client";

import {
  Store,
  LayoutGrid,
  Pencil,
  Layers,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useInView } from "@/lib/useInView";

const REASONS = [
  {
    icon: Store,
    title: "Built around the stores",
    desc: "We know Play Store and App Store guidelines inside out. Limits, formatting, what the algorithms reward.",
  },
  {
    icon: LayoutGrid,
    title: "Category-aware prompts",
    desc: "Each category has its own language, keywords, and audience. We use them all.",
  },
  {
    icon: Pencil,
    title: "Edit, don't accept",
    desc: "Every draft is fully editable in place. We generate starting points, not finished products.",
  },
  {
    icon: Layers,
    title: "Three angles, one click",
    desc: "Keyword-optimized, conversion-focused, and brand-led. Pick the angle that fits your strategy.",
  },
  {
    icon: Search,
    title: "Keyword visibility",
    desc: "See exactly which keywords appear in your copy and how often. No guesswork.",
  },
  {
    icon: ShieldCheck,
    title: "Honest, not hype",
    desc: "We don't promise rankings or downloads. We give you better copy and let you decide.",
  },
];

export function WhyUs() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          <p className="text-xs text-ink-faint uppercase tracking-[0.2em] mb-4">
            Why Outreach
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            Built different. On purpose.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className={`p-6 rounded-3xl bg-surface border border-line-soft hover:border-line transition-colors ${
                  inView ? "animate-fade-up" : "opacity-0"
                }`}
                style={{ animationDelay: inView ? `${i * 80}ms` : undefined }}
              >
                <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center mb-5">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{reason.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {reason.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
