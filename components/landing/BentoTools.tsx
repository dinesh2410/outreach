"use client";

import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  Activity,
  MessageSquare,
  BarChart3,
  Key,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type Main = {
  eyebrow: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  status: "live" | "soon";
  illo: React.ReactNode;
  iconTile: string;
  iconColor: string;
  icon: React.ReactNode;
};

const MAIN_CARDS: Main[] = [
  {
    eyebrow: "Tool 01 · Main",
    title: "ASO Generator",
    desc:
      "Three description angles per platform from one brief — keyword-optimized, conversion-focused, and brand-led. Both stores, character limits enforced.",
    href: "/generator",
    cta: "Try the generator",
    status: "live",
    iconTile: "tile-blue",
    iconColor: "#0B3D7A",
    icon: <FileText size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-2xl bg-white border border-line-soft shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0B3D7A" }}>
              Conversion
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-faint" />
            <span className="text-[10px] text-ink-muted">v3</span>
          </div>
          <p className="text-[13px] font-semibold text-ink leading-snug mb-2">
            Build habits that actually stick.
          </p>
          <div className="space-y-1">
            <div className="h-1.5 rounded bg-cream-deep w-full" />
            <div className="h-1.5 rounded bg-cream-deep w-[88%]" />
            <div className="h-1.5 rounded bg-cream-deep w-[72%]" />
          </div>
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Tool 02 · Main",
    title: "Screenshot Generator",
    desc:
      "Ship polished store screenshots with text overlays and localization. App Store and Play Store sizes, ready to upload.",
    href: "/features/screenshots",
    cta: "Join the waitlist",
    status: "soon",
    iconTile: "tile-lilac",
    iconColor: "#5B3FB8",
    icon: <ImageIcon size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5">
          {[
            { bg: "linear-gradient(135deg, #D7E5FB, #A8C4F0)", t: "Track" },
            { bg: "linear-gradient(135deg, #E8DEFF, #C9B8F5)", t: "Grow"  },
            { bg: "linear-gradient(135deg, #D8F2E3, #A8DCC0)", t: "Win"   },
          ].map((s, i) => (
            <div
              key={i}
              className="w-[68px] aspect-[9/16] rounded-xl shadow-md p-2 flex flex-col justify-between"
              style={{ background: s.bg }}
            >
              <div className="h-1.5 rounded bg-white/60 w-[60%]" />
              <div className="text-[10px] font-bold text-white drop-shadow-sm">{s.t}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Tool 03 · Support",
    title: "Score Checker",
    desc:
      "Paste any store URL, get a 0–100 audit against the ASO playbook with 6 actionable checks. Free, no sign-up.",
    href: "/score",
    cta: "Audit your listing",
    status: "live",
    iconTile: "tile-mint",
    iconColor: "#0F6F44",
    icon: <Activity size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-2xl bg-white border border-line-soft shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0F6F44" }}>
              Audit
            </span>
            <span className="text-[24px] font-bold leading-none" style={{ color: "#0B3D7A" }}>
              87
            </span>
          </div>
          <div className="h-2 rounded-full bg-cream-deep overflow-hidden mb-3">
            <div className="h-full rounded-full" style={{ width: "87%", backgroundColor: "#2563EB" }} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Sparkles size={11} style={{ color: "#0F6F44" }} />
            <span>6 of 6 checks complete</span>
          </div>
        </div>
      </div>
    ),
  },
];

type Mini = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  desc: string;
  href: string;
  tile: string;
  color: string;
};

const ROADMAP: Mini[] = [
  {
    icon: MessageSquare,
    title: "Reddit Replies",
    desc: "Find threads in your category and draft contextual replies.",
    href: "/features/reddit",
    tile: "tile-cream",
    color: "#8A5A00",
  },
  {
    icon: BarChart3,
    title: "Competitor Analysis",
    desc: "Side-by-side comparison of any two store listings.",
    href: "/features/competitor",
    tile: "tile-rose",
    color: "#B0274F",
  },
  {
    icon: Key,
    title: "Keyword Research",
    desc: "Discover and track keywords for your category.",
    href: "/features/keywords",
    tile: "tile-peach",
    color: "#9E4A0F",
  },
];

export function BentoTools() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="eyebrow mb-5">The toolset</p>
          <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
            Two main tools, one workflow
          </h2>
          <p className="mt-5 text-[16px] text-ink-muted leading-relaxed">
            <strong className="text-ink font-semibold">ASO Generator</strong> and <strong className="text-ink font-semibold">Screenshot Generator</strong>
            {" "}are the heart of the workspace. The score checker and the rest of the roadmap below extend it.
          </p>
        </div>

        {/* Main tools (3 hero cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MAIN_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group card-soft p-7 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`w-11 h-11 rounded-xl ${card.iconTile} flex items-center justify-center`}
                  style={{ color: card.iconColor }}
                >
                  {card.icon}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${
                    card.status === "live"
                      ? "text-white"
                      : "bg-cream-deep text-ink-muted"
                  }`}
                  style={card.status === "live" ? { backgroundColor: "#10B981" } : undefined}
                >
                  {card.status === "live" ? "Live" : "Soon"}
                </span>
              </div>

              <p
                className="text-[12px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{ color: card.iconColor }}
              >
                {card.eyebrow}
              </p>
              <h3 className="text-[24px] font-semibold text-ink mb-3 tracking-[-0.01em]">
                {card.title}
              </h3>
              <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
                {card.desc}
              </p>

              <div className="relative -mx-7 mt-auto h-[160px] rounded-b-2xl bg-cream-deep overflow-hidden">
                {card.illo}
              </div>

              <span
                className="mt-6 inline-flex items-center gap-1 text-[13px] font-semibold group-hover:gap-2 transition-all"
                style={{ color: "#0B3D7A" }}
              >
                {card.cta}
                <ArrowRight size={13} strokeWidth={2.25} />
              </span>
            </Link>
          ))}
        </div>

        {/* Roadmap row (smaller cards) */}
        <div className="mt-16">
          <p className="eyebrow mb-6 text-center">Also on the roadmap</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {ROADMAP.map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.title} href={r.href} className="group card-soft p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${r.tile} flex items-center justify-center shrink-0`}
                      style={{ color: r.color }}
                    >
                      <Icon size={16} strokeWidth={1.85} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-semibold text-ink">{r.title}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em] bg-cream-deep text-ink-muted">
                          Soon
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] text-ink-muted leading-relaxed">{r.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
