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

// Honest framing: indie-product, no real partner logos yet — so the band shows
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
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 items-center">
        <h3 className="text-[22px] lg:text-[24px] font-semibold text-ink leading-snug max-w-sm">
          Trusted across every category indie devs ship in.
        </h3>

        <div
          className="overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <div className="flex w-max items-center gap-10 py-2 animate-marquee-x">
            {[...CATEGORIES, ...CATEGORIES].map((cat, i) => {
              const Icon = cat.Icon;
              return (
                <div
                  key={`${cat.name}-${i}`}
                  className="flex items-center gap-2.5 shrink-0"
                  style={{ color: "#0B3D7A" }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  <span className="text-[16px] lg:text-[17px] font-semibold whitespace-nowrap tracking-tight">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
