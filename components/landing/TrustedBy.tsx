"use client";

import {
  Zap,
  Brain,
  Code,
  Gamepad2,
  Users,
  Heart,
  Wallet,
  Activity,
  Music,
  Camera,
  type LucideIcon,
} from "lucide-react";

// Adapted from 21st.dev's "Logo Cloud 3" by efferd — soft radial gradient backdrop,
// two-line accented headline, infinite marquee with edge fades. Pure CSS marquee
// instead of framer-motion to avoid the dep.
//
// Honest framing: indie-product, no real partner logos yet — so the marquee shows
// the app categories the generator supports rather than fake brand logos.

type Category = { Icon: LucideIcon; name: string };

const CATEGORIES: Category[] = [
  { Icon: Zap,       name: "Productivity" },
  { Icon: Brain,     name: "AI Tools" },
  { Icon: Code,      name: "Dev Tools" },
  { Icon: Gamepad2,  name: "Games" },
  { Icon: Users,     name: "Social" },
  { Icon: Heart,     name: "Lifestyle" },
  { Icon: Wallet,    name: "Finance" },
  { Icon: Activity,  name: "Health & Fitness" },
  { Icon: Music,     name: "Music" },
  { Icon: Camera,    name: "Photo & Video" },
];

export function TrustedBy() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      {/* Soft radial gradient backdrop — the "ellipse" from the reference */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%)",
          filter: "blur(30px)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.15]">
            <span className="font-normal text-ink-muted">Trusted across categories.</span>
            <br />
            Built for the apps you ship.
          </h2>
        </div>

        <CategoryMarquee />
      </div>
    </section>
  );
}

// Infinite horizontal marquee. Children are duplicated so when the first set scrolls
// to -50%, the second set is already in view and the loop is seamless.
function CategoryMarquee() {
  const items = [...CATEGORIES, ...CATEGORIES];
  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    >
      <div className="flex w-max items-center gap-12 py-4 animate-marquee-x">
        {items.map((cat, i) => {
          const Icon = cat.Icon;
          return (
            <div
              key={`${cat.name}-${i}`}
              className="flex items-center gap-2.5 shrink-0 text-ink-faint"
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="text-base font-medium whitespace-nowrap">{cat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
