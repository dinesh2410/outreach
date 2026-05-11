"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "What are the two main tools?",
    a: "The ASO Generator writes store-ready descriptions (three angles per platform from one brief). The Screenshot Generator ships polished store screenshots with text overlays and localization. The ASO Generator is live today; the Screenshot Generator is shipping next.",
  },
  {
    q: "What stores do the tools support?",
    a: "Both — Apple App Store and Google Play. Character limits are enforced per platform (App Store has a 30-char subtitle and 4,000-char description; Play has an 80-char short description and 4,000-char full description) so what you copy is what the store accepts.",
  },
  {
    q: "What angles does the ASO Generator give me?",
    a: "Three: keyword-optimized (built for discovery), conversion-focused (built to convert the store visitor), and brand-led (built for tone consistency with your existing voice). You can pick one, mix copy from all three, or refine in place.",
  },
  {
    q: "Is the Score Checker free?",
    a: "Yes — paste any App Store or Play Store URL and get a 0–100 score against the ASO playbook with actionable fixes. No sign-up required. Sign up to save audits and re-run them as your listing changes.",
  },
  {
    q: "What's on the roadmap after the Screenshot Generator?",
    a: "Reddit Replies (find threads and draft contextual responses), Competitor Analysis (side-by-side comparison of any two listings), and Keyword Research (discover and track keywords for your category). Order is set by what our users ask for most.",
  },
  {
    q: "Do I own the copy I generate?",
    a: "Yes. Everything you generate is yours to use, edit, ship, and re-license. We don't retain rights to your generations and we don't reuse them to train models.",
  },
  {
    q: "Will the AI sound like a marketing intern?",
    a: "Not if we can help it. We tuned the prompts against real indie-app listings and tested them with the maker community. The brand variant in particular is built to sound like a developer wrote it — no corporate-speak adjective stacks.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section style={{ backgroundColor: "#EFF4FE" }}>
      <div className="max-w-[1400px] mx-auto px-8 py-24 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="eyebrow mb-5">Frequently asked</p>
          <h2
            className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em]"
            style={{ color: "#0B3D7A" }}
          >
            Questions before you sign up
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((qa, i) => {
            const open = openIdx === i;
            return (
              <div
                key={qa.q}
                className="card-soft overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[16px] lg:text-[17px] font-semibold text-ink">
                    {qa.q}
                  </span>
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 tile-blue"
                  >
                    {open ? <Minus size={16} strokeWidth={2.25} /> : <Plus size={16} strokeWidth={2.25} />}
                  </span>
                </button>
                {open && (
                  <div className="px-6 pb-6 -mt-1 animate-slide-down">
                    <p className="text-[15px] text-ink-muted leading-relaxed max-w-2xl">
                      {qa.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
