"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useInView } from "@/lib/useInView";

const PRINCIPLES = [
  {
    num: "01",
    title: "Edit, don't accept",
    desc: "AI generates starting points. You make them yours. We'll never pretend a machine wrote your best listing.",
  },
  {
    num: "02",
    title: "Store-native, not store-agnostic",
    desc: "We build around the stores' real constraints. Character limits, formatting rules, algorithm preferences. Not generic text generation.",
  },
  {
    num: "03",
    title: "Show, don't promise",
    desc: "We won't tell you we'll get you 100 users. We'll give you better copy and let the results speak for themselves.",
  },
  {
    num: "04",
    title: "Indie-first, always",
    desc: "Enterprise can wait. Our users are solo devs, small teams, weekend builders. Everything we build serves them first.",
  },
];

export function AboutContent() {
  const { ref, inView } = useInView();

  return (
    <main>
      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-semibold text-ink">
            We&apos;ve watched a lot of indie launches.
          </h1>
        </div>
      </section>

      {/* Big quote card */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-surface rounded-3xl border border-line overflow-hidden grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 bg-gradient-to-br from-accent to-gold p-8 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-4xl font-serif italic">&ldquo;</span>
              </div>
            </div>
            <div className="md:col-span-3 p-8 md:p-12 flex items-center">
              <p className="text-xl md:text-2xl font-serif italic text-ink leading-relaxed">
                Good apps with bad listings. We see it every week.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-24 bg-cream-deep/30">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-ink mb-8">Our story</h2>
          <div className="space-y-6 text-ink-muted leading-relaxed">
            <p>
              We run a community of 10,000+ indie app developers. Over the
              years, we&apos;ve watched more than 40,000 apps ship through our
              programs. We&apos;ve seen what works and what doesn&apos;t.
            </p>
            <p>
              The pattern is always the same: a developer spends months building
              something genuinely good, then writes a store listing in 20
              minutes and wonders why nobody finds it. The listing is the first
              thing users see. It&apos;s not an afterthought &mdash; it&apos;s
              the pitch.
            </p>
            <p>
              We built Outreach because the existing options were either
              too generic (ChatGPT doesn&apos;t know Play Store limits) or too
              expensive (agencies charge thousands). There should be a middle
              ground: smart, store-aware tools that an indie dev can use in
              under a minute.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-16 md:py-24" ref={ref}>
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-ink mb-12">
            What we believe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.num}
                className={`p-8 rounded-3xl bg-surface border border-line ${
                  inView ? "animate-fade-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="font-mono text-sm text-ink-faint">{p.num}</span>
                <h3 className="text-lg font-semibold text-ink mt-2 mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="bg-night rounded-3xl p-12">
            <h2 className="text-3xl font-semibold text-white">
              Ready to write a better listing?
            </h2>
            <p className="mt-4 text-white/60">
              Join 10,000+ indie devs who are done with bad listings.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-accent text-white font-semibold rounded-2xl hover:bg-accent-soft transition-colors"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
