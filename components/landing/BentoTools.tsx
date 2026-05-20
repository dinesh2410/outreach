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
  Star,
} from "@/components/shared/Icon";

type Card = {
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

const MAIN_CARDS: Card[] = [
  {
    eyebrow: "Tool 01 · Main",
    title: "ASO Generator",
    desc:
      "Paste a store URL or fill a brief, pick your target keyword, and get a publish-ready listing optimized for discovery. Both stores, character limits enforced.",
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
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-accent-ink">
              Keyword-optimized
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-faint" />
            <span className="text-[10px] text-ink-muted">habit tracker</span>
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
      "Paste any store URL, get a 0–100 audit with keyword placement checks and actionable fixes. Enter your own keyword for a sharper score. Free, no sign-up.",
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
            <span className="text-[24px] font-bold leading-none text-accent-ink">
              87
            </span>
          </div>
          <div className="h-2 rounded-full bg-cream-deep overflow-hidden mb-3">
            <div className="h-full rounded-full bg-accent" style={{ width: "87%" }} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Sparkles size={11} style={{ color: "#0F6F44" }} />
            <span>All checks complete</span>
          </div>
        </div>
      </div>
    ),
  },
];

const ALSO_CARDS: Card[] = [
  {
    eyebrow: "Tool 04 · Validate",
    title: "Reddit Demand",
    desc:
      "Check if people on Reddit are already asking for your idea. Surfaces the posts, complaints, and questions that prove real demand — before you build.",
    href: "/reddit",
    cta: "Validate an idea",
    status: "live",
    iconTile: "tile-cream",
    iconColor: "#8A5A00",
    icon: <MessageSquare size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-2xl bg-white border border-line-soft shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] p-3 flex gap-3">
          <div
            className="shrink-0 w-9 rounded-lg flex flex-col items-center justify-center py-1"
            style={{ backgroundColor: "#FFE9D6" }}
          >
            <div
              className="text-[9px] font-bold leading-none mb-0.5"
              style={{ color: "#8A5A00" }}
            >
              ▲
            </div>
            <div
              className="text-[12px] font-bold tabular-nums leading-none"
              style={{ color: "#8A5A00" }}
            >
              1.2k
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-medium text-ink-faint mb-1">r/SideProject · 18h</p>
            <p className="text-[12px] font-semibold text-ink leading-snug mb-2">
              Is there an app that just tracks how often I open my phone?
            </p>
            <div className="space-y-1">
              <div className="h-1 rounded bg-cream-deep w-full" />
              <div className="h-1 rounded bg-cream-deep w-[70%]" />
            </div>
            <span
              className="inline-block mt-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]"
              style={{ backgroundColor: "#FFE9D6", color: "#8A5A00" }}
            >
              Asking for it
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Tool 05 · Compare",
    title: "Competitor Watch",
    desc:
      "Auto-discover the apps competing for your keyword. Compare ratings, rating volume, char usage, and keyword airspace in one side-by-side dashboard.",
    href: "/competitor",
    cta: "Compare competitors",
    status: "live",
    iconTile: "tile-rose",
    iconColor: "#B0274F",
    icon: <BarChart3 size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-2xl bg-white border border-line-soft shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] p-3">
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ color: "#B0274F" }}
            >
              You vs competitors
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]"
              style={{ backgroundColor: "#FCE8EC", color: "#B0274F" }}
            >
              Comparable
            </span>
          </div>
          {[
            { name: "Your app", val: 78, color: "#B0274F" },
            { name: "Habitica", val: 92, color: "#9CA3AF" },
            { name: "Streaks", val: 64, color: "#9CA3AF" },
          ].map((r) => (
            <div key={r.name} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <span className="w-[52px] text-[9px] text-ink-muted truncate">{r.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-cream-deep overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.val}%`, backgroundColor: r.color }}
                />
              </div>
              <span className="w-[22px] text-[9px] tabular-nums text-right text-ink">
                {r.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Tool 06 · Rank",
    title: "Keyword Research",
    desc:
      "Live Play Store + App Store rank for any keyword, per country. Difficulty score, intent breakdown, and the top apps you're up against — in seconds.",
    href: "/keywords",
    cta: "Check a keyword",
    status: "live",
    iconTile: "tile-peach",
    iconColor: "#9E4A0F",
    icon: <Key size={20} strokeWidth={1.85} />,
    illo: (
      <div className="relative h-full w-full">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] rounded-2xl bg-white border border-line-soft shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ color: "#9E4A0F" }}
            >
              &ldquo;habit tracker&rdquo;
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]"
              style={{ backgroundColor: "#FFF6E0", color: "#9E4A0F" }}
            >
              Hard 78
            </span>
          </div>
          {[
            { rank: 1, name: "Habitica", rating: 4.6 },
            { rank: 2, name: "Streaks", rating: 4.8 },
            { rank: 3, name: "HabitNow", rating: 4.5 },
          ].map((r) => (
            <div key={r.rank} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <span
                className="w-4 text-[11px] font-bold tabular-nums text-right"
                style={{ color: r.rank <= 3 ? "#0B3D7A" : "#9CA3AF" }}
              >
                {r.rank}
              </span>
              <span className="flex-1 text-[10px] font-semibold text-ink truncate">
                {r.name}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] text-ink-muted tabular-nums">
                <Star size={8} strokeWidth={2} style={{ color: "#FBBF24" }} />
                {r.rating}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function ToolHeroCard({ card }: { card: Card }) {
  return (
    <Link
      href={card.href}
      className="group card-soft p-5 sm:p-7 flex flex-col overflow-hidden hover:shadow-[0_0_0_1px_rgba(37,99,235,0.12),0_24px_48px_-16px_rgba(11,61,122,0.2)] hover:-translate-y-1"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div
          className={`w-11 h-11 rounded-xl ${card.iconTile} flex items-center justify-center`}
          style={{ color: card.iconColor }}
        >
          {card.icon}
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${
            card.status === "live" ? "text-white bg-green" : "bg-gold/10 text-gold"
          }`}
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
      <p className="text-[14px] text-ink-muted leading-relaxed mb-6">{card.desc}</p>

      <div className="relative -mx-5 sm:-mx-7 mt-auto h-[140px] sm:h-[160px] rounded-b-2xl bg-cream-deep overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
        {card.illo}
      </div>

      <span
        className="mt-6 inline-flex items-center gap-1 text-[13px] font-semibold group-hover:gap-2 transition-all text-accent-ink"
      >
        {card.cta}
        <ArrowRight size={13} strokeWidth={2.25} />
      </span>
    </Link>
  );
}

export function BentoTools() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <p className="eyebrow mb-4 sm:mb-5">The toolset</p>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[56px] font-semibold text-ink leading-[1.1] sm:leading-[1.05] tracking-[-0.02em]">
            Six tools, one workflow
          </h2>
          <p className="mt-4 sm:mt-5 text-[15px] sm:text-[16px] text-ink-muted leading-relaxed">
            <strong className="text-ink font-semibold">ASO Generator</strong> and{" "}
            <strong className="text-ink font-semibold">Screenshot Generator</strong> are the
            heart of the workspace. The other four extend it — score audits, demand validation,
            competitor benchmarking, and live keyword rankings.
          </p>
        </div>

        {/* Main tools — 3 hero cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {MAIN_CARDS.map((card) => (
            <ToolHeroCard key={card.title} card={card} />
          ))}
        </div>

        {/* Also-in-workspace tools — same hero treatment, separate row */}
        <div className="mt-10 md:mt-14">
          <p className="eyebrow mb-5 sm:mb-6 text-center">Also in the workspace</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {ALSO_CARDS.map((card) => (
              <ToolHeroCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
