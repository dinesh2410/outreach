"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useInView } from "@/lib/useInView";

export function FinalCTA() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className={inView ? "animate-fade-up" : "opacity-0"}>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-tight">
            Your next listing is three drafts away.
          </h2>
          <p className="mt-5 text-lg text-ink-muted leading-relaxed max-w-xl mx-auto">
            Pick the angle that fits. Edit it in place. Copy and publish. The
            whole thing takes under a minute.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/auth" className="btn-pill-dark">
              Start generating
              <span className="arrow-circle">
                <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </Link>
            <Link href="/features" className="btn-pill-light">
              See all features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
