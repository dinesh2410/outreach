"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
  quote: string;
  author: string;
  brand: string;
  brandColor: string;
};

const TABS: Tab[] = [
  {
    id: "indie",
    label: "Indie",
    eyebrow: "For solo makers",
    title: "Powerful tools, simple setup",
    bullets: [
      "AI-generated descriptions in under a minute",
      "Keyword-optimized for discovery and installs",
      "Free ASO score on every listing",
      "History — every generation saved automatically",
    ],
    cta: "Start free →",
    ctaHref: "/auth",
    quote:
      "ReachFront replaced four tabs I had open at launch. I paste the URL, pick a keyword, and ship a polished listing in an afternoon.",
    author: "Lena K. · Indie iOS dev",
    brand: "Snapnote",
    brandColor: "#5B3FB8",
  },
  {
    id: "studio",
    label: "Studio",
    eyebrow: "For app studios",
    title: "Scale across every listing",
    bullets: [
      "Manage every app from one workspace",
      "Reuse brand voice across launches",
      "Track score trends per app",
      "Team library — share what works",
    ],
    cta: "Explore Studio →",
    ctaHref: "/features",
    quote:
      "We launch a new app every two months. Having one workspace for every store listing means we stop reinventing the copy wheel.",
    author: "Marcus T. · Studio founder",
    brand: "Tinyflow Labs",
    brandColor: "#0F6F44",
  },
  {
    id: "agency",
    label: "Agency",
    eyebrow: "For agencies & teams",
    title: "Built for client workflows",
    bullets: [
      "Generate listings on behalf of clients",
      "White-label exports of every report",
      "Role-based access across the workspace",
      "Bulk score-checker for portfolios",
    ],
    cta: "Get a demo →",
    ctaHref: "/auth",
    quote:
      "ReachFront gives us the speed of in-house copywriters without the headcount. Clients see options the same day they brief us.",
    author: "Priya R. · Agency lead",
    brand: "Pagecast",
    brandColor: "#B0274F",
  },
];

export function ScoreChecker() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const active = TABS.find((t) => t.id === activeId)!;

  return (
    <section id="score-checker" className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-32">
        <h2 className="text-center text-[28px] sm:text-[36px] lg:text-[40px] font-semibold text-ink leading-[1.1] sm:leading-[1.05] tracking-[-0.02em] max-w-4xl mx-auto">
          Built for every maker — from first launch to portfolio
        </h2>

        {/* Tabs */}
        <div className="mt-8 sm:mt-12 flex justify-center">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-cream-deep">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`px-4 sm:px-6 py-2.5 rounded-full text-[14px] sm:text-[15px] font-medium transition-all ${
                  activeId === t.id
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
                style={activeId === t.id ? { backgroundColor: "var(--color-accent-band)", boxShadow: "0 2px 8px rgba(37,99,235,0.15)" } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div key={activeId} className="mt-10 sm:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center animate-tab-content">
          <div>
            <div
              className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em] mb-4 sm:mb-5 text-accent-ink"
            >
              {active.eyebrow}
            </div>
            <h3 className="text-[26px] sm:text-[34px] lg:text-[44px] font-semibold text-ink leading-[1.1] tracking-[-0.02em]">
              {active.title}
            </h3>
            <p className="mt-4 sm:mt-6 text-[15px] sm:text-[16px] text-ink-muted leading-relaxed">
              Start fast. Ship confidently. Launch polished store listings
              without the blank-page paralysis.
            </p>
            <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3">
              {active.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink mt-2 sm:mt-2.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href={active.ctaHref}
              className="btn-pill-dark mt-7 sm:mt-8"
            >
              {active.cta}
            </Link>
          </div>

          <div className="rounded-3xl bg-cream-deep p-6 sm:p-8 lg:p-10 relative">
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 text-[48px] sm:text-[60px] leading-none font-serif text-ink/15" aria-hidden="true">
              &ldquo;
            </div>
            <div
              className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl font-bold text-white text-[18px] sm:text-[20px] mb-4 sm:mb-6"
              style={{ backgroundColor: active.brandColor }}
            >
              {active.brand.slice(0, 1)}
            </div>
            <p className="text-[15px] sm:text-[17px] lg:text-[18px] text-ink leading-relaxed italic">
              &ldquo;{active.quote}&rdquo;
            </p>
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-ink/10">
              <div className="text-[13px] sm:text-[14px] font-semibold text-ink">{active.author}</div>
              <div className="text-[12px] sm:text-[13px] text-ink-muted mt-0.5">{active.brand}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
