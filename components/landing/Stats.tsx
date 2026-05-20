"use client";

import { Code2, Heart, Lock, Sparkles, Zap, MessageCircle } from "@/components/shared/Icon";

const BADGES = [
  { icon: <Heart size={22} strokeWidth={1.75} />,         label: "Built in public",   tile: "#FCE8EC", text: "#B0274F" },
  { icon: <Sparkles size={22} strokeWidth={1.75} />,      label: "Free first listing", tile: "#E8DEFF", text: "#5B3FB8" },
  { icon: <Zap size={22} strokeWidth={1.75} />,           label: "Listing in <60s",   tile: "#D7E5FB", text: "#0B3D7A" },
  { icon: <Code2 size={22} strokeWidth={1.75} />,         label: "Open changelog",    tile: "#F2EFE7", text: "#5C4A1A" },
  { icon: <Lock size={22} strokeWidth={1.75} />,          label: "Your data, yours",  tile: "#D8F2E3", text: "#0F6F44" },
  { icon: <MessageCircle size={22} strokeWidth={1.75} />, label: "Maker community",   tile: "#FFE9D6", text: "#9E4A0F" },
];

export function Stats() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <div className="rounded-3xl px-5 sm:px-8 lg:px-16 py-10 sm:py-14 lg:py-20" style={{ backgroundColor: "#FFF6E0" }}>
          <h2 className="text-center text-[24px] sm:text-[28px] lg:text-[36px] font-semibold text-ink leading-snug tracking-[-0.01em] max-w-2xl mx-auto">
            Made for makers — not marketing teams
          </h2>

          <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
            {BADGES.map((b) => (
              <div key={b.label} className="flex flex-col items-center text-center gap-2.5 sm:gap-3 hover:scale-105 transition-transform duration-200 cursor-default">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: b.tile, color: b.text }}
                >
                  {b.icon}
                </div>
                <div className="text-[12px] sm:text-[13px] font-semibold text-ink leading-snug max-w-[120px]">
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
