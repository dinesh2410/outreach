"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "@/components/shared/Icon";

export function Capabilities() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 section-pad grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Left: product UI mosaic */}
        <div className="relative h-[400px] lg:h-[520px] hidden md:block overflow-hidden">
          {/* Card A — Library / variants list */}
          <div className="absolute top-0 left-0 w-[320px] rounded-2xl bg-white border border-line-soft shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent-band flex items-center justify-center text-[11px] font-bold text-accent-ink">
                  L
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-ink">Library</div>
                  <div className="text-[11px] text-ink-faint">12 saved listings</div>
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-medium text-white bg-accent">
                New
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { l: "HabitFlow · Play", t: "Build habits that actually stick.", s: "Active", c: "#10B981" },
                { l: "Snapnote · iOS",   t: "Snapnote — capture, sort, forget.", s: "Draft",  c: "#9CA3AF" },
                { l: "Streaky · Play",   t: "Daily habits, weekly streaks.",     s: "Active", c: "#10B981" },
              ].map((row) => (
                <div key={row.l} className="rounded-lg border border-line-soft px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">{row.l}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: row.c, backgroundColor: `${row.c}15` }}>
                      {row.s}
                    </span>
                  </div>
                  <div className="text-[12px] text-ink truncate">{row.t}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card B — Customer Data / Recent users */}
          <div className="absolute top-12 right-0 w-[280px] rounded-2xl bg-white border border-line-soft shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ backgroundColor: "#E8DEFF", color: "#5B3FB8" }}>
                I
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-ink">Insights</div>
                <div className="text-[11px] text-ink-faint">Top performing</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { n: "habit tracker",  v: "Trending", c: "#0B3D7A", b: "#D7E5FB" },
                { n: "minimalist",     v: "Stable",   c: "#0F6F44", b: "#D8F2E3" },
                { n: "offline sync",   v: "Rising",   c: "#5B3FB8", b: "#E8DEFF" },
              ].map((k) => (
                <div key={k.n} className="flex items-center justify-between text-[12px]">
                  <span className="text-ink">{k.n}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: k.c, backgroundColor: k.b }}>
                    {k.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card C — Revenue / Score trend */}
          <div className="absolute bottom-0 left-12 w-[260px] rounded-2xl bg-white border border-line-soft shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-faint">ASO score</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Last 30 days</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#10B981" }}>
                <TrendingUp size={12} strokeWidth={2.5} />
                +18%
              </div>
            </div>
            <div className="flex items-end gap-1 mt-3">
              <span className="text-[28px] font-bold text-ink leading-none">87</span>
              <span className="text-[12px] text-ink-muted mb-1">/100</span>
            </div>
            <svg viewBox="0 0 220 70" className="w-full h-12 mt-2">
              <defs>
                <linearGradient id="cap-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 50 L 30 42 L 60 46 L 90 35 L 120 28 L 150 22 L 180 14 L 220 8 L 220 70 L 0 70 Z" fill="url(#cap-area)" />
              <path d="M 0 50 L 30 42 L 60 46 L 90 35 L 120 28 L 150 22 L 180 14 L 220 8" stroke="#2563EB" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* Card D — small badge */}
          <div className="absolute bottom-32 right-8 w-[180px] rounded-2xl bg-white border border-line-soft shadow-[0_24px_50px_-24px_rgba(11,61,122,0.3)] p-4">
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Generated today</div>
            <div className="text-[28px] font-bold text-ink leading-none mt-1">14</div>
            <div className="text-[11px] text-ink-muted mt-1">listings generated</div>
          </div>
        </div>

        {/* Right: copy */}
        <div>
          <div
            className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em] mb-4 sm:mb-6 text-accent-ink"
          >
            All-In-One Workspace
          </div>
          <h2
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] sm:leading-[1.05] tracking-[-0.02em] text-accent-ink"
          >
            Built to scale with every launch
          </h2>
          <p className="mt-5 sm:mt-7 text-[15px] sm:text-[17px] lg:text-[18px] text-ink leading-relaxed max-w-md">
            From your first MVP to your fifth side-project, manage every app
            listing in one place. Track scores, save generations, and re-use what
            works across your portfolio.
          </p>

          <Link href="/auth" className="link-arrow mt-8 inline-flex">
            Sign up free
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </section>
  );
}
