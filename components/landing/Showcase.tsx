"use client";

import { MockASOResults } from "../mocks/MockASOResults";
import { MockKeywordExtraction } from "../mocks/MockKeywordExtraction";
import { useInView } from "@/lib/useInView";

export function Showcase() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-12 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            From blank page to publish-ready in under a minute.
          </h2>
        </div>

        {/* Browser frame */}
        <div
          className={`bg-surface rounded-3xl border border-line-soft overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_20px_40px_-12px_rgba(0,0,0,0.06)] ${
            inView ? "animate-fade-up delay-200" : "opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line-soft bg-cream">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-line" />
              <div className="w-3 h-3 rounded-full bg-line" />
              <div className="w-3 h-3 rounded-full bg-line" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-paper border border-line-soft rounded-full px-3 py-1 text-xs text-ink-faint max-w-md mx-auto">
                reachfront.app/generator
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <MockASOResults />
            <div className="space-y-4">
              <MockKeywordExtraction />
              <div className="p-4 rounded-2xl bg-cream border border-line-soft">
                <p className="text-xs text-ink-faint mb-2">Full editor</p>
                <div className="space-y-2">
                  <div className="h-2 rounded bg-ink/8 w-full" />
                  <div className="h-2 rounded bg-ink/8 w-4/5" />
                  <div className="h-2 rounded bg-ink/8 w-3/4" />
                  <div className="h-2 rounded bg-ink/8 w-full" />
                  <div className="h-2 rounded bg-ink/8 w-2/3" />
                  <div className="h-2 rounded bg-ink/8 w-5/6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
