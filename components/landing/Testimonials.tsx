"use client";

import { FileText, Sparkles, Send } from "lucide-react";

type Step = {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  bg: string;
  accent: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Drop in a brief",
    desc:
      "App name, category, features, tone. The form takes about 30 seconds — and there's a one-click example if you want to see the format first.",
    icon: <FileText size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #D7E5FB 0%, #A8C4F0 100%)",
    accent: "#0B3D7A",
  },
  {
    num: "02",
    title: "Get three angles",
    desc:
      "Conversion, brand, and discovery variants for the platform you picked. Live character counters keep you inside the store's limits as you edit.",
    icon: <Sparkles size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #E8DEFF 0%, #C9B8F5 100%)",
    accent: "#5B3FB8",
  },
  {
    num: "03",
    title: "Ship the keeper",
    desc:
      "Edit in place, copy to your clipboard, or save the variant to your library for later. Everything you generate is auto-saved to history.",
    icon: <Send size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #D8F2E3 0%, #A8DCC0 100%)",
    accent: "#0F6F44",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="eyebrow mb-5">How it works</p>
          <h2 className="text-[40px] lg:text-[56px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
            From blank page to ready-to-ship in three steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="group relative rounded-3xl aspect-[4/5] overflow-hidden"
              style={{ background: s.bg }}
            >
              <div className="absolute inset-0 p-7 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-2xl bg-white/85 backdrop-blur-sm flex items-center justify-center"
                    style={{ color: s.accent }}
                  >
                    {s.icon}
                  </div>
                  <span
                    className="text-[13px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: s.accent }}
                  >
                    Step {s.num}
                  </span>
                </div>

                <div>
                  <h3
                    className="text-[28px] lg:text-[32px] font-semibold tracking-[-0.01em] leading-tight mb-3"
                    style={{ color: s.accent }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[14px] text-ink leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
