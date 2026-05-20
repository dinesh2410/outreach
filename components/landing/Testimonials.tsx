"use client";

import { FileText, Sparkles, Send } from "@/components/shared/Icon";

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
    title: "Paste a URL or fill a brief",
    desc:
      "Pick your platform, drop in a store URL to auto-import your listing, or fill in the details manually. Takes under a minute either way.",
    icon: <FileText size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #D7E5FB 0%, #A8C4F0 100%)",
    accent: "#0B3D7A",
  },
  {
    num: "02",
    title: "Pick your target keyword",
    desc:
      "We suggest keywords based on your app and category. Pick the one you want to rank for — the generator optimizes your entire listing around it.",
    icon: <Sparkles size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #E8DEFF 0%, #C9B8F5 100%)",
    accent: "#5B3FB8",
  },
  {
    num: "03",
    title: "Ship the listing",
    desc:
      "Get a publish-ready description optimized for your keyword, with live character counters that match store limits. Edit, copy, and ship.",
    icon: <Send size={22} strokeWidth={1.85} />,
    bg: "linear-gradient(135deg, #D8F2E3 0%, #A8DCC0 100%)",
    accent: "#0F6F44",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <p className="eyebrow mb-4 sm:mb-5">How it works</p>
          <h2 className="text-[28px] sm:text-[36px] lg:text-[40px] font-semibold text-ink leading-[1.1] sm:leading-[1.05] tracking-[-0.02em]">
            From store URL to publish-ready in three steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="group relative rounded-3xl aspect-[4/5] overflow-hidden hover:scale-[1.02] hover:shadow-[0_30px_60px_-20px_rgba(11,61,122,0.3)] transition-all duration-300"
              style={{ background: s.bg }}
            >
              <div className="absolute inset-0 p-5 sm:p-7 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/85 backdrop-blur-sm flex items-center justify-center"
                    style={{ color: s.accent }}
                  >
                    {s.icon}
                  </div>
                  <span
                    className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: s.accent }}
                  >
                    Step {s.num}
                  </span>
                </div>

                <div>
                  <h3
                    className="text-[24px] sm:text-[28px] lg:text-[32px] font-semibold tracking-[-0.01em] leading-tight mb-2 sm:mb-3"
                    style={{ color: s.accent }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-ink leading-relaxed">
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
