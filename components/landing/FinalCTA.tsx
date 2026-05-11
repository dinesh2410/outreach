"use client";

import Link from "next/link";

export function FinalCTA() {
  return (
    <section style={{ backgroundColor: "#D7E5FB" }}>
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28 text-center">
        <h2 className="text-[40px] lg:text-[60px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-3xl mx-auto">
          Ready to ship a sharper listing?
        </h2>
        <p className="mt-6 text-[17px] lg:text-[18px] text-ink max-w-xl mx-auto leading-relaxed">
          Generate your first set of variants in under a minute. Keep what
          works, refine what doesn&apos;t, ship the listing your app deserves.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/auth"
            className="px-6 py-3 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors"
          >
            Sign up free
          </Link>
          <Link
            href="/auth"
            className="px-6 py-3 rounded-full border-[1.5px] border-ink text-[15px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
          >
            Get a demo
          </Link>
        </div>

        <p className="mt-5 text-[13px] text-ink-muted">No credit card required.</p>
      </div>
    </section>
  );
}
