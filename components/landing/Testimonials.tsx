"use client";

import { useInView } from "@/lib/useInView";

const TESTIMONIALS = [
  {
    quote: "I used to spend hours on my Play Store description. Now I generate three options and pick the best one in minutes.",
    name: "Alex Chen",
    role: "Indie dev, Productivity",
  },
  {
    quote: "The keyword-optimized variant literally doubled my impressions in the first week. Not a typo.",
    name: "Maria Santos",
    role: "Solo founder, Health app",
  },
  {
    quote: "Finally a tool that doesn't try to do everything. It does descriptions really well and that's exactly what I needed.",
    name: "Jordan Park",
    role: "Game developer",
  },
  {
    quote: "The character counters alone save me from Play Store rejections. The three-angle approach is the cherry on top.",
    name: "Priya Sharma",
    role: "Indie dev, Finance",
  },
  {
    quote: "I showed the brand-led variant to my designer and she thought I hired a copywriter. That's the vibe.",
    name: "Tom Okoro",
    role: "Lifestyle app founder",
  },
  {
    quote: "Compare-all view is my favorite feature. Seeing three approaches side by side makes the choice obvious.",
    name: "Lena Fischer",
    role: "Dev tools maker",
  },
];

export function Testimonials() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32 bg-cream-deep" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            What devs are saying.
          </h2>
          <p className="mt-4 text-ink-muted max-w-xl mx-auto">
            Real stories from indie makers who shipped better listings with Outreach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className={`p-6 rounded-3xl bg-surface border border-line-soft ${
                inView ? "animate-fade-up" : "opacity-0"
              }`}
              style={{ animationDelay: inView ? `${i * 80}ms` : undefined }}
            >
              <p className="text-sm text-ink leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-ink-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
