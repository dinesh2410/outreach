"use client";

import { CountUp } from "../shared/CountUp";
import { useInView } from "@/lib/useInView";

const STATS = [
  { value: 40000, suffix: "+", label: "Apps shipped" },
  { value: 10000, suffix: "+", label: "Developers" },
  { value: 30, suffix: "+", label: "Categories" },
  { value: 60, suffix: "s", label: "Avg time to a draft" },
];

export function Stats() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32 bg-cream-deep" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            Built to scale, proven to perform.
          </h2>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-5xl md:text-6xl font-semibold text-ink tracking-tight">
                {inView ? (
                  <CountUp target={stat.value} suffix={stat.suffix} />
                ) : (
                  `0${stat.suffix}`
                )}
              </div>
              <p className="mt-3 text-sm text-ink-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
