"use client";

import { useState } from "react";
import { Plus, Minus } from "@/components/shared/Icon";

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "What are the two main tools?",
    a: "The ASO Generator writes a keyword-optimized store description for your app — paste a URL or fill a brief, pick your target keyword, and get a publish-ready listing. The Screenshot Generator ships polished store screenshots with text overlays and localization. The ASO Generator is live today; the Screenshot Generator is shipping next.",
  },
  {
    q: "What stores do the tools support?",
    a: "Both — Apple App Store and Google Play. Character limits are enforced per platform (App Store has a 30-char subtitle and 4,000-char description; Play has an 80-char short description and 4,000-char full description) so what you copy is what the store accepts.",
  },
  {
    q: "How does the keyword flow work?",
    a: "After you enter your app details, we suggest relevant keywords based on your app and category. You pick the one you want to rank for, and the generator optimizes your entire listing around that keyword — title, short description, and full description.",
  },
  {
    q: "Is the Score Checker free?",
    a: "Yes — paste any App Store or Play Store URL and get a 0–100 score against the ASO playbook with actionable fixes. You can also enter your own primary keyword for a more accurate audit. No sign-up required.",
  },
  {
    q: "What other tools are available?",
    a: "Beyond the two main tools, we have four live support tools: Score Checker (free ASO audit), Reddit Demand (validate your idea against real Reddit threads), Competitor Watch (side-by-side listing comparison), and Keyword Research (live rankings and difficulty scores).",
  },
  {
    q: "Do I own the copy I generate?",
    a: "Yes. Everything you generate is yours to use, edit, ship, and re-license. We don't retain rights to your generations and we don't reuse them to train models.",
  },
  {
    q: "Will the AI sound like a marketing intern?",
    a: "Not if we can help it. We tuned the prompts against real indie-app listings and tested them with the maker community. The output is built to sound like a developer wrote it — no corporate-speak adjective stacks.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="bg-accent-band-soft">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14 sm:py-20 lg:py-32">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <p className="eyebrow mb-4 sm:mb-5">Frequently asked</p>
          <h2
            className="text-[28px] sm:text-[36px] lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-accent-ink"
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
                className="card-soft overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 sm:gap-6 px-5 sm:px-6 py-4 sm:py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-[15px] sm:text-[16px] lg:text-[17px] font-semibold text-ink">
                    {qa.q}
                  </span>
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 tile-blue transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                  >
                    {open ? <Minus size={16} strokeWidth={2.25} /> : <Plus size={16} strokeWidth={2.25} />}
                  </span>
                </button>
                {open && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1 animate-slide-down">
                    <p className="text-[14px] sm:text-[15px] text-ink-muted leading-relaxed max-w-2xl">
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
