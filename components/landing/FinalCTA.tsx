"use client";

import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative bg-ink overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20" style={{ background: "radial-gradient(ellipse, #2563EB 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-32 text-center">
        <h2 className="text-[30px] sm:text-[40px] lg:text-[60px] font-semibold text-white leading-[1.1] sm:leading-[1.05] tracking-[-0.02em] max-w-3xl mx-auto">
          Ready to ship a sharper listing?
        </h2>
        <p className="mt-4 sm:mt-6 text-[15px] sm:text-[17px] lg:text-[18px] text-white/60 max-w-xl mx-auto leading-relaxed">
          Generate your first keyword-optimized listing in under a minute.
          Refine it, copy it, ship the listing your app deserves.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white text-ink text-[16px] font-semibold hover:bg-cream transition-colors"
          >
            Sign up free
          </Link>
          <Link
            href="/score"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border-[1.5px] border-white/25 text-white text-[16px] font-medium hover:border-white/50 hover:bg-white/5 transition-colors"
          >
            Audit your listing
          </Link>
        </div>

        <p className="mt-5 sm:mt-6 text-[13px] text-white/40">No credit card required.</p>
      </div>
    </section>
  );
}
