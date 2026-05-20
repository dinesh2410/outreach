"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/shared/Icon";
import { useInView } from "@/lib/useInView";

const PRINCIPLES = [
  {
    num: "01",
    title: "Edit, don't accept",
    desc: "AI generates starting points. You make them yours. We won't pretend a machine wrote your best listing.",
    tile: "tile-blue",
  },
  {
    num: "02",
    title: "Store-native, not store-agnostic",
    desc: "We build around the stores' real constraints — character limits, formatting rules, algorithm preferences. Not generic text generation.",
    tile: "tile-lilac",
  },
  {
    num: "03",
    title: "Show, don't promise",
    desc: "We won't tell you we'll get you 100 users. We'll give you better copy and let the results speak for themselves.",
    tile: "tile-mint",
  },
  {
    num: "04",
    title: "Indie-first, always",
    desc: "Enterprise can wait. Our users are solo devs, small teams, weekend builders. Everything we build serves them first.",
    tile: "tile-cream",
  },
];

export function AboutContent() {
  const { ref, inView } = useInView();

  return (
    <main className="pt-20">
      {/* Hero band */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "#D7E5FB" }}
      >
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32 text-center">
          <p className="eyebrow mb-5">About · ReachFront</p>
          <h1 className="text-[44px] lg:text-[64px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-4xl mx-auto">
            We&apos;ve watched a lot of indie launches.
          </h1>
          <p className="mt-7 text-[17px] lg:text-[19px] text-ink leading-relaxed max-w-2xl mx-auto">
            Good apps with bad listings. We see it every week — and we built ReachFront
            to close the gap between &ldquo;ship it&rdquo; and &ldquo;people find it.&rdquo;
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-8 py-24 lg:py-32">
          <p className="eyebrow mb-5">The story</p>
          <h2
            className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
            style={{ color: "#0B3D7A" }}
          >
            Why we built it
          </h2>
          <div className="mt-8 space-y-5 text-[16px] lg:text-[17px] text-ink leading-relaxed">
            <p>
              We run a community of indie app developers. Over the years, we&apos;ve
              watched apps ship through our programs and seen what works and what
              doesn&apos;t.
            </p>
            <p>
              The pattern is always the same: a developer spends months building
              something genuinely good, then writes a store listing in 20 minutes
              and wonders why nobody finds it. The listing is the first thing users
              see — it&apos;s not an afterthought, it&apos;s the pitch.
            </p>
            <p>
              We built ReachFront because the existing options were either too generic
              (ChatGPT doesn&apos;t know Play Store limits) or too expensive (agencies
              charge thousands). There should be a middle ground: smart, store-aware
              tools an indie dev can use in under a minute.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section style={{ backgroundColor: "#EFF4FE" }} ref={ref}>
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow mb-5">Principles</p>
            <h2
              className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
              style={{ color: "#0B3D7A" }}
            >
              What we believe
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.num}
                className={`card-soft p-8 ${inView ? "animate-fade-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${p.tile} inline-flex items-center justify-center mb-5 font-mono text-[13px] font-bold`}
                >
                  {p.num}
                </div>
                <h3 className="text-[20px] font-semibold text-ink mb-3 tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="text-[15px] text-ink-muted leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: "#D7E5FB" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-28 text-center">
          <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em] max-w-3xl mx-auto">
            Ready to write a better listing?
          </h2>
          <p className="mt-6 text-[17px] text-ink max-w-xl mx-auto leading-relaxed">
            Generate your first keyword-optimized listing in under a minute.
            Free for your first listing.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 mt-10 px-6 py-3 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors"
          >
            Get started
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
