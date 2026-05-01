"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Is this actually free?",
    a: "The score checker is completely free, no sign-up needed. The description generator requires a free account. We haven't announced pricing yet — early users will get a heads up before anything changes.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT doesn't know Play Store character limits, doesn't generate multiple angles, doesn't extract keywords, and doesn't know what works in specific app categories. We do.",
  },
  {
    q: "Will it write my description for me?",
    a: "It gives you three strong starting points. We believe in edit-don't-accept — you should always put your voice on the final version. The editor makes that easy.",
  },
  {
    q: "What categories do you support?",
    a: "We currently support 9 categories: Productivity, AI/ML, Dev Tools, Games, Social, Lifestyle, Finance, Health & Fitness, and a general category. Each has tailored keywords and prompts.",
  },
  {
    q: "Can I use it for iOS and Android?",
    a: "Yes. Pick one or both platforms. Android gets a title + short description + full description. iOS gets a title + subtitle + full description. Limits are enforced for each store.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            Questions? Answers.
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line-soft bg-surface overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium text-ink pr-4">{faq.q}</span>
                <Plus
                  size={18}
                  className={`text-ink shrink-0 transition-transform duration-300 ${
                    open === i ? "rotate-45" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-5 animate-slide-down">
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
