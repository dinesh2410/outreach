"use client";

import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, Sparkles } from "lucide-react";

export function FeatureShowcase() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: workflow visual — phone with two output cards */}
        <div className="relative h-[520px]">
          {/* Connecting lines drawn behind */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 500 520"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M 90 130 L 250 260" stroke="#0B3D7A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.25" />
            <path d="M 410 380 L 250 280" stroke="#0B3D7A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.25" />
          </svg>

          {/* Center phone mockup */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[440px] rounded-[2.5rem] bg-ink p-2 shadow-[0_30px_60px_-20px_rgba(11,61,122,0.4)]">
            <div className="w-full h-full rounded-[2rem] bg-cream-warm overflow-hidden relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-ink" />
              <div className="pt-12 px-5">
                <div className="w-14 h-14 rounded-xl mx-auto mb-3" style={{ backgroundColor: "#2563EB" }} />
                <div className="text-center text-[15px] font-semibold text-ink">Your app</div>
                <div className="text-center text-[11px] text-ink-muted mt-0.5">Store listing preview</div>
                <div className="mt-5 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-ink/10 w-full" />
                  <div className="h-1.5 rounded-full bg-ink/10 w-[88%]" />
                  <div className="h-1.5 rounded-full bg-ink/10 w-[72%]" />
                </div>
                <div className="mt-4 px-3 py-2.5 rounded-xl bg-white text-[11px] font-medium text-center" style={{ color: "#2563EB" }}>
                  Get the app
                </div>
                <div className="mt-3 px-3 py-2 rounded-xl border border-ink/10 text-[10px] text-center text-ink-muted">
                  ★ ★ ★ ★ ★ &nbsp;ASO score · 87
                </div>
              </div>
            </div>
          </div>

          {/* ASO Description node — top-left */}
          <div className="absolute top-[10%] left-[2%] w-[220px] rounded-2xl bg-white shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] border border-line-soft p-4 animate-node-float-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg tile-blue flex items-center justify-center">
                <FileText size={15} strokeWidth={2} />
              </div>
              <span className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: "#0B3D7A" }}>
                ASO Generator
              </span>
            </div>
            <p className="text-[13px] font-semibold text-ink leading-snug mb-2">
              Build habits that actually stick.
            </p>
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-cream-deep w-full" />
              <div className="h-1.5 rounded bg-cream-deep w-[78%]" />
            </div>
          </div>

          {/* Screenshot Generator node — bottom-right */}
          <div className="absolute bottom-[10%] right-[2%] w-[220px] rounded-2xl bg-white shadow-[0_18px_36px_-16px_rgba(11,61,122,0.3)] border border-line-soft p-4 animate-node-float-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg tile-lilac flex items-center justify-center">
                <ImageIcon size={15} strokeWidth={2} />
              </div>
              <span className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: "#5B3FB8" }}>
                Screenshot Generator
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="aspect-[9/16] rounded-md" style={{ background: "linear-gradient(135deg, #D7E5FB, #A8C4F0)" }} />
              <div className="aspect-[9/16] rounded-md" style={{ background: "linear-gradient(135deg, #E8DEFF, #C9B8F5)" }} />
              <div className="aspect-[9/16] rounded-md" style={{ background: "linear-gradient(135deg, #D8F2E3, #A8DCC0)" }} />
            </div>
          </div>

          {/* Small floating Sparkles indicator */}
          <div className="absolute top-[40%] right-[8%] animate-drift">
            <div className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center">
              <Sparkles size={15} strokeWidth={2} style={{ color: "#2563EB" }} />
            </div>
          </div>
        </div>

        {/* Right: copy */}
        <div>
          <div
            className="text-[13px] font-bold uppercase tracking-[0.15em] mb-6"
            style={{ color: "#0B3D7A" }}
          >
            Two tools · One workflow
          </div>
          <h2
            className="text-[40px] lg:text-[56px] font-semibold leading-[1.05] tracking-[-0.02em]"
            style={{ color: "#0B3D7A" }}
          >
            Everything your store listing needs
          </h2>
          <p className="mt-7 text-[17px] lg:text-[18px] text-ink leading-relaxed max-w-md">
            Generate store-ready descriptions with the <strong className="font-semibold">ASO Generator</strong>,
            then ship polished store screenshots with the <strong className="font-semibold">Screenshot Generator</strong>.
            Both tuned for App Store and Play Store from one brief.
          </p>

          <Link href="/features" className="link-arrow mt-8 inline-flex">
            Learn more
            <ArrowRight size={18} strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </section>
  );
}
