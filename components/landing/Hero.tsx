"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles, FileText, TrendingUp, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Hero() {
  const { user, loading } = useAuth();
  const isAuthed = !!user && !loading;
  const generatorHref = isAuthed ? "/generator" : "/auth?next=%2Fgenerator";
  return (
    <section
      className="relative overflow-hidden select-none pt-20"
      style={{ backgroundColor: "#D7E5FB" }}
    >
      <div className="relative max-w-[1400px] mx-auto px-8 pt-16 pb-24 lg:pt-24 lg:pb-32 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        {/* Left column — copy */}
        <div className="relative z-10">
          <h1 className="text-[44px] sm:text-[56px] lg:text-[72px] font-semibold text-ink leading-[1.02] tracking-[-0.02em]">
            <span className="word-reveal block" style={{ animationDelay: "0.15s" }}>
              You built the app.
            </span>
            <span className="word-reveal block" style={{ animationDelay: "0.3s" }}>
              Now what?
            </span>
          </h1>

          <p
            className="mt-8 max-w-xl text-[17px] lg:text-[19px] text-ink leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.55s" }}
          >
            Outreach is the post-build workspace for indie app makers. Two main
            tools — <strong className="font-semibold">ASO Generator</strong> and{" "}
            <strong className="font-semibold">Screenshot Generator</strong> — with a free
            score checker, Reddit replies, competitor analysis and keyword research
            on the way.
          </p>

          <div
            className="mt-10 flex items-center gap-3 flex-wrap animate-fade-up"
            style={{ animationDelay: "0.75s" }}
          >
            <Link href={generatorHref} className="btn-pill-dark">
              {isAuthed ? "Open the generator" : "Try the generator"}
            </Link>
            <Link
              href="/score"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border-[1.5px] border-ink text-[15px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
            >
              Audit your listing
            </Link>
          </div>

          <div
            className="mt-10 animate-fade-up flex items-center gap-3 flex-wrap"
            style={{ animationDelay: "0.95s" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink/10 text-[12px] font-medium text-ink">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: "#10B981" }} />
              ASO Generator · Live
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink/10 text-[12px] font-medium text-ink-muted">
              Screenshot Generator · Coming soon
            </span>
          </div>
        </div>

        {/* Right column — layered product UI mosaic */}
        <div className="relative h-[480px] lg:h-[560px]">
          {/* Base app shell card */}
          <div
            className="absolute top-0 left-0 right-0 bottom-8 rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgba(11,61,122,0.35)] border border-white animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line-soft">
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
            </div>
            <div className="grid grid-cols-[140px_1fr] h-[calc(100%-44px)]">
              <aside className="border-r border-line-soft p-4 space-y-1">
                {[
                  { i: <Sparkles size={14} />, l: "Generate", a: true },
                  { i: <FileText size={14} />, l: "Library" },
                  { i: <Search size={14} />, l: "Score" },
                  { i: <TrendingUp size={14} />, l: "Insights" },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] ${
                      row.a ? "bg-accent-band text-accent-ink font-medium" : "text-ink-muted"
                    }`}
                  >
                    {row.i}
                    <span>{row.l}</span>
                  </div>
                ))}
                <div className="mt-6 pt-4 border-t border-line-soft text-[10px] uppercase tracking-wider text-ink-faint">
                  Recent
                </div>
                <div className="space-y-2 mt-2">
                  {["Habit Tracker", "Snapnote", "Rivvy"].map((n) => (
                    <div key={n} className="text-[12px] text-ink-muted truncate">
                      {n}
                    </div>
                  ))}
                </div>
              </aside>
              <main className="p-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#0B3D7A" }}>
                  Generated · Conversion
                </div>
                <div className="mt-2 text-[18px] font-semibold text-ink leading-snug">
                  Build habits that actually stick.
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded bg-line-soft w-[92%]" />
                  <div className="h-2 rounded bg-line-soft w-[88%]" />
                  <div className="h-2 rounded bg-line-soft w-[78%]" />
                  <div className="h-2 rounded bg-line-soft w-[68%]" />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-ink-faint">Score</span>
                  <div className="flex-1 h-1.5 bg-line-soft rounded-full overflow-hidden">
                    <div className="h-full rounded-full w-[82%]" style={{ backgroundColor: "#2563EB" }} />
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: "#0B3D7A" }}>82</span>
                </div>
              </main>
            </div>
          </div>

          {/* Floating card 1 — Score ring */}
          <div
            className="absolute top-4 -left-4 lg:left-4 w-[180px] rounded-2xl bg-white shadow-[0_20px_40px_-20px_rgba(11,61,122,0.4)] border border-white p-4 animate-drift"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-lilac flex items-center justify-center">
                <Sparkles size={14} className="text-purple" />
              </div>
              <span className="text-[12px] font-semibold text-ink">ASO Score</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[36px] font-bold text-ink leading-none">87</span>
              <span className="text-[11px] text-green font-medium mb-1">+12 this week</span>
            </div>
            <div className="mt-3 h-1.5 bg-line-soft rounded-full overflow-hidden">
              <div className="h-full rounded-full w-[87%]" style={{ backgroundColor: "#2563EB" }} />
            </div>
          </div>

          {/* Floating card 2 — Keyword chip cluster */}
          <div
            className="absolute top-44 -right-6 lg:right-0 w-[220px] rounded-2xl bg-white shadow-[0_20px_40px_-20px_rgba(11,61,122,0.4)] border border-white p-4"
            style={{ animation: "drift 7s ease-in-out infinite 0.5s" }}
          >
            <div className="text-[11px] uppercase tracking-wider text-ink-faint mb-2">
              Trending keywords
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { l: "habit tracker", w: true },
                { l: "daily streak", w: false },
                { l: "minimalist", w: false },
                { l: "offline", w: true },
                { l: "widgets", w: false },
              ].map((k) => (
                <span
                  key={k.l}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    k.w
                      ? "text-white"
                      : "bg-cream-deep text-ink"
                  }`}
                  style={k.w ? { backgroundColor: "#2563EB" } : undefined}
                >
                  {k.l}
                </span>
              ))}
            </div>
          </div>

          {/* Floating card 3 — Variant card */}
          <div
            className="absolute bottom-0 left-8 lg:left-24 w-[240px] rounded-2xl bg-white shadow-[0_20px_40px_-20px_rgba(11,61,122,0.4)] border border-white overflow-hidden"
            style={{ animation: "drift 6.5s ease-in-out infinite 0.3s" }}
          >
            <div className="px-4 py-3 border-b border-line-soft flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#0B3D7A" }}>
                Brand variant
              </span>
              <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: "#10B981" }} />
            </div>
            <div className="p-4">
              <div className="text-[14px] font-semibold text-ink leading-snug">
                Snapnote — capture, sort, forget.
              </div>
              <div className="mt-2 space-y-1">
                <div className="h-1.5 rounded bg-line-soft w-full" />
                <div className="h-1.5 rounded bg-line-soft w-[80%]" />
                <div className="h-1.5 rounded bg-line-soft w-[60%]" />
              </div>
            </div>
          </div>

          {/* Floating card 4 — Cursor pointer */}
          <div
            className="absolute top-32 right-12 lg:right-24 animate-drift"
            style={{ animationDelay: "0.8s" }}
          >
            <ArrowUpRight
              size={18}
              className="text-ink rotate-[200deg]"
              strokeWidth={2.5}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
