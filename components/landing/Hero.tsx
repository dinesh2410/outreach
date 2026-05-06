"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroWorkflow } from "./HeroWorkflow";

export function Hero() {
  return (
    <section className="relative overflow-hidden select-none min-h-[90vh] flex">
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

      <div className="relative w-full max-w-6xl mx-auto px-6 pt-24 pb-12 md:pt-28 md:pb-16 flex flex-col justify-center">
        {/* Draggable workflow — string + interactive nodes layered behind the headline */}
        <HeroWorkflow />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold text-ink leading-[1.05] tracking-tight max-w-4xl">
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
        </div>
      </div>
    </section>
  );
}
