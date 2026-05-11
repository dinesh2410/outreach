"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Send } from "lucide-react";

type Agent = {
  pill: string;
  title: string;
  desc: string;
  preview: React.ReactNode;
};

const AGENTS: Agent[] = [
  {
    pill: "Conversion Variant",
    title: "Copy that drives the install",
    desc: "Built for the user reading your screenshots in 6 seconds. Lead with the value, name the outcome, cut the corporate-speak.",
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
            <div className="text-[12px] font-semibold text-ink">Generating conversion variant…</div>
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
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: "#2563EB" }}>habit</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: "#2563EB" }}>streak</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: "#2563EB" }}>daily</span>
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
    pill: "Brand Variant",
    title: "Voice that sounds like a maker",
    desc: "For the indie hacker who hates corporate copy. Confident, specific, no buzzwords — just the thing your app actually does.",
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
            <div className="text-[12px] font-semibold text-ink">Brand voice locked in</div>
          </div>
          <div className="rounded-xl bg-cream-deep p-4">
            <div className="text-[15px] font-semibold text-ink leading-snug">
              Snapnote — capture, sort, forget.
            </div>
            <div className="text-[12px] text-ink-muted mt-2 leading-relaxed">
              The notes app for people who think faster than they type. Drop a
              thought, walk away, find it later. That&apos;s the whole pitch.
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded-lg bg-accent-band-soft text-[11px] font-medium" style={{ color: "#0B3D7A" }}>
            ✓ Brand voice matches your previous launches
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
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
        {/* Left: copy + nav */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" style={{ backgroundColor: "#F2ECFE" }}>
            <Sparkles size={14} style={{ color: "#5B3FB8" }} />
            <span className="text-[13px] font-medium" style={{ color: "#5B3FB8" }}>AI-powered, ASO-tuned</span>
          </div>

          <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
            AI variants that ship with you, and for you
          </h2>
          <p className="mt-7 text-[17px] lg:text-[18px] text-ink leading-relaxed max-w-md">
            Meet the variant generators tuned for every store surface. They
            skip the blank page so you can stay focused on the launch.
          </p>

          <div className="mt-10 flex items-center gap-3">
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
        </div>

        {/* Right: agent preview card */}
        <div className="relative">
          <div key={idx} className="animate-tab-content">
            <div className="text-[13px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#0B3D7A" }}>
              {current.pill}
            </div>
            <h3 className="text-[26px] font-semibold text-ink leading-snug mb-4">{current.title}</h3>
            <p className="text-[15px] text-ink-muted mb-6 max-w-lg leading-relaxed">{current.desc}</p>
            {current.preview}
          </div>
        </div>
      </div>
    </section>
  );
}
