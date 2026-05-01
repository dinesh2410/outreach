"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  BarChart3,
  Search,
} from "lucide-react";

const TOOL_NODES = [
  { Icon: FileText, label: "Descriptions", x: 80, y: 110, delay: "0s", float: "animate-node-float-1" },
  { Icon: ImageIcon, label: "Screenshots", x: 260, y: 50, delay: "0.3s", float: "animate-node-float-2" },
  { Icon: MessageCircle, label: "Reddit", x: 470, y: 30, delay: "0.6s", float: "animate-node-float-3" },
  { Icon: BarChart3, label: "Competitor", x: 680, y: 50, delay: "0.9s", float: "animate-node-float-2" },
  { Icon: Search, label: "Keywords", x: 860, y: 110, delay: "1.2s", float: "animate-node-float-1" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Floating gradient orbs that roam across the hero */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-40 w-[520px] h-[520px] rounded-full bg-pink/20 blur-[120px] animate-orb-drift" />
        <div className="absolute -top-10 -right-40 w-[520px] h-[520px] rounded-full bg-purple/20 blur-[120px] animate-orb-drift-2" />
        <div className="absolute bottom-0 left-1/3 w-[440px] h-[440px] rounded-full bg-pink/12 blur-[140px] animate-orb-drift-3" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Animated workflow decoration */}
        <div className="relative h-48 md:h-56 mb-2 hidden sm:block">
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0"
            width="940"
            height="220"
            viewBox="0 0 940 220"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF7A9B" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#A855F7" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FF7A9B" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
              </linearGradient>
              <mask id="fadeMask">
                <rect width="940" height="220" fill="url(#fadeGradient)" />
              </mask>
            </defs>

            {/* Curved connector paths */}
            <g mask="url(#fadeMask)">
              <path
                d="M 110 130 Q 240 130, 290 80"
                stroke="url(#strokeGradient)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-dash-flow"
                fill="none"
              />
              <path
                d="M 290 80 Q 380 80, 470 60 Q 560 80, 650 80"
                stroke="url(#strokeGradient)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-dash-flow"
                fill="none"
              />
              <path
                d="M 650 80 Q 700 130, 830 130"
                stroke="url(#strokeGradient)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-dash-flow"
                fill="none"
              />

              {/* Pulse glows at line endpoints */}
              <circle cx="110" cy="130" r="3" fill="#FF7A9B" className="animate-pulse-glow" />
              <circle cx="830" cy="130" r="3" fill="#A855F7" className="animate-pulse-glow" style={{ animationDelay: "1.2s" }} />
            </g>
          </svg>

          {/* Tool nodes positioned absolutely */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[940px] h-full">
            {TOOL_NODES.map(({ Icon, label, x, y, delay, float }) => (
              <div
                key={label}
                className={`absolute ${float}`}
                style={{ left: `${x}px`, top: `${y}px`, animationDelay: delay }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-line-soft shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center">
                    <Icon size={20} className="text-ink" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <span className="pill-badge animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Sparkles size={14} className="text-ink" />
            ASO Generator
          </span>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-semibold text-ink leading-[1.05] tracking-tight max-w-4xl">
            <span className="word-reveal" style={{ animationDelay: "0.3s" }}>You</span>{" "}
            <span className="word-reveal" style={{ animationDelay: "0.4s" }}>built</span>{" "}
            <span className="word-reveal" style={{ animationDelay: "0.5s" }}>the</span>{" "}
            <span className="word-reveal" style={{ animationDelay: "0.6s" }}>app.</span>{" "}
            <span className="word-reveal" style={{ animationDelay: "0.75s" }}>Now</span>{" "}
            <span className="word-reveal" style={{ animationDelay: "0.85s" }}>what?</span>
          </h1>

          <p className="mt-6 text-lg text-ink-muted max-w-2xl leading-relaxed animate-fade-up" style={{ animationDelay: "1s" }}>
            Outreach is the platform for everything after build &mdash; ASO
            descriptions, screenshots, Reddit, competitor analysis, keyword
            research, ad creative. Starting with descriptions today.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up" style={{ animationDelay: "1.15s" }}>
            <Link href="/auth" className="btn-pill-dark group">
              Try the generator
              <span className="arrow-circle transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </Link>
            <a href="#score-checker" className="btn-pill-light">
              Audit your listing
            </a>
          </div>

          <div className="mt-10 flex items-center gap-3 animate-fade-up" style={{ animationDelay: "1.3s" }}>
            <div className="flex -space-x-2">
              {[
                "from-pink to-purple",
                "from-purple to-ink",
                "from-ink to-ink-muted",
                "from-ink-muted to-pink",
              ].map((g, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} border-2 border-cream`}
                />
              ))}
            </div>
            <p className="text-sm text-ink-muted">
              Trusted by{" "}
              <span className="font-medium text-ink">10,000+</span> indie devs
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
