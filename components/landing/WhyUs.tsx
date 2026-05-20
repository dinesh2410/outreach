"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Send } from "@/components/shared/Icon";

type Agent = {
  pill: string;
  title: string;
  desc: string;
  preview: React.ReactNode;
};

const AGENTS: Agent[] = [
  {
    pill: "Keyword-optimized",
    title: "Copy that ranks and converts",
    desc: "Pick your target keyword and the generator weaves it through your title, short description, and full listing — optimized for both discovery and installs.",
    preview: (
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] border border-line-soft overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line-soft">
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E8DEFF" }}>
              <Sparkles size={14} style={{ color: "#5B3FB8" }} />
            </div>
            <div className="text-[12px] font-semibold text-ink">Optimizing for &ldquo;habit tracker&rdquo;</div>
          </div>
          <div className="rounded-xl bg-cream-deep p-4">
            <div className="text-[15px] font-semibold text-ink leading-snug">
              Build habits that actually stick.
            </div>
            <div className="text-[12px] text-ink-muted mt-2 leading-relaxed">
              Track daily streaks, get reminders that don&apos;t nag, and watch
              one small habit turn into the routine you wanted.
            </div>
            <div className="mt-3 flex gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white bg-accent">habit tracker</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white bg-accent">streak</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white bg-accent">daily</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input className="flex-1 px-3 py-2 rounded-lg bg-cream-deep text-[12px] text-ink-muted" placeholder="Refine the hook…" readOnly />
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: "#0A0A0A" }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    ),
  },
  {
    pill: "URL import",
    title: "Start from your existing listing",
    desc: "Paste your App Store or Play Store URL and we auto-import everything — app name, description, category. Then pick a keyword and regenerate a sharper version.",
    preview: (
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] border border-line-soft overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line-soft">
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#D8F2E3" }}>
              <Sparkles size={14} style={{ color: "#0F6F44" }} />
            </div>
            <div className="text-[12px] font-semibold text-ink">Listing imported</div>
          </div>
          <div className="rounded-xl bg-cream-deep p-4">
            <div className="text-[15px] font-semibold text-ink leading-snug">
              Snapnote — capture, sort, forget.
            </div>
            <div className="text-[12px] text-ink-muted mt-2 leading-relaxed">
              Auto-imported from the App Store. Pick your target keyword
              and we&apos;ll generate a listing optimized around it.
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded-lg bg-accent-band-soft text-[11px] font-medium text-accent-ink">
            ✓ Title, category, and description imported
          </div>
        </div>
      </div>
    ),
  },
];

export function WhyUs() {
  const [idx, setIdx] = useState(0);
  const current = AGENTS[idx];

  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 md:gap-16 items-center">
        {/* Left: copy + nav */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 sm:mb-8 bg-lilac-soft">
            <Sparkles size={14} className="text-purple" />
            <span className="text-[12px] sm:text-[13px] font-medium text-purple">AI-powered, ASO-tuned</span>
          </div>

          <h2 className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold text-ink leading-[1.1] sm:leading-[1.05] tracking-[-0.02em]">
            AI that writes for the algorithm and the human
          </h2>
          <p className="mt-5 sm:mt-7 text-[15px] sm:text-[17px] lg:text-[18px] text-ink leading-relaxed max-w-md">
            Pick a keyword, get a listing built around it. Import from a URL
            or start from scratch — either way, you ship faster.
          </p>

          <div className="mt-7 sm:mt-10 flex items-center gap-3">
            <button
              onClick={() => setIdx((idx - 1 + AGENTS.length) % AGENTS.length)}
              aria-label="Previous"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-cream-deep text-ink hover:bg-ink hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => setIdx((idx + 1) % AGENTS.length)}
              aria-label="Next"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-ink text-white hover:bg-night-soft transition-colors"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {AGENTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-ink w-6" : "bg-ink/20"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right: agent preview card */}
        <div className="relative">
          <div key={idx} className="animate-tab-content">
            <div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em] mb-3 text-accent-ink">
              {current.pill}
            </div>
            <h3 className="text-[22px] sm:text-[26px] font-semibold text-ink leading-snug mb-3 sm:mb-4">{current.title}</h3>
            <p className="text-[14px] sm:text-[15px] text-ink-muted mb-5 sm:mb-6 max-w-lg leading-relaxed">{current.desc}</p>
            {current.preview}
          </div>
        </div>
      </div>
    </section>
  );
}
