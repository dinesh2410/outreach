"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
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

        {/* Right column — real product dashboard */}
        <div className="relative">
          <div
            className="relative rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgba(11,61,122,0.45)] border border-white overflow-hidden animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line-soft bg-white">
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="ml-3 text-[11px] text-ink-faint truncate">outreach / dashboard</span>
            </div>
            <Image
              src="/hero/dashboard-v2.png"
              alt="Outreach dashboard"
              width={1600}
              height={1000}
              priority
              className="block w-full h-auto"
            />
          </div>

          {/* Floating ASO Score accent */}
          <div
            className="hidden sm:block absolute -bottom-6 -left-4 lg:-left-6 w-[180px] rounded-2xl bg-white shadow-[0_20px_40px_-20px_rgba(11,61,122,0.4)] border border-white p-4 animate-drift"
            style={{ animationDelay: "0.7s" }}
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
        </div>
      </div>
    </section>
  );
}
