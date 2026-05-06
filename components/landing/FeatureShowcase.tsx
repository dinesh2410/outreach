"use client";

import { useState } from "react";
import { FileText, Camera, MessageSquare, BarChart3, Key } from "lucide-react";
import { MockASOResults } from "../mocks/MockASOResults";
import { MockScreenshot } from "../mocks/MockScreenshot";
import { MockRedditReply } from "../mocks/MockRedditReply";
import { MockCompetitor } from "../mocks/MockCompetitor";
import { MockKeywords } from "../mocks/MockKeywords";
import { useInView } from "@/lib/useInView";

// Adapted from 21st.dev's Hero 195 layout — tab bar + bordered product preview
// with a beam border and faint vertical guide-lines in the background.
// Uses the Outreach cream palette instead of shadcn's dark theme.

const TABS = [
  { id: "desc",   label: "Descriptions", Icon: FileText,       content: <MockASOResults /> },
  { id: "shots",  label: "Screenshots",  Icon: Camera,         content: <MockScreenshot /> },
  { id: "reddit", label: "Reddit",       Icon: MessageSquare,  content: <MockRedditReply /> },
  { id: "comp",   label: "Competitor",   Icon: BarChart3,      content: <MockCompetitor /> },
  { id: "kw",     label: "Keywords",     Icon: Key,            content: <MockKeywords /> },
] as const;

export function FeatureShowcase() {
  const { ref, inView } = useInView();
  const [active, setActive] = useState(0);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-24 md:py-32"
    >
      {/* Faint vertical guide lines, faded at top & bottom */}
      <BackgroundLines />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className={`text-center mb-12 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight max-w-2xl mx-auto leading-[1.1]">
            From blank page to publish-ready in under a minute.
          </h2>
          <p className="mt-5 text-lg text-ink-muted max-w-xl mx-auto">
            Five tools, one workflow. Switch tabs to see each one in action.
          </p>
        </div>

        {/* Tab bar */}
        <div className={`flex justify-center mb-10 ${inView ? "animate-fade-up delay-100" : "opacity-0"}`}>
          <div
            role="tablist"
            aria-label="Feature preview"
            className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-line-soft shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            {TABS.map((tab, i) => {
              const Icon = tab.Icon;
              const isActive = active === i;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-ink text-white shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.25 : 2} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated bordered frame around the tab content */}
        <div
          className={`relative rounded-3xl overflow-hidden ${
            inView ? "animate-fade-up delay-200" : "opacity-0"
          }`}
        >
          {/* Rotating conic-gradient backing — creates the "comet" beam effect */}
          <div
            aria-hidden="true"
            className="absolute -inset-[60%] animate-spin-slow opacity-70 pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, transparent 72%, rgba(255,122,155,0.55) 82%, rgba(168,85,247,0.55) 92%, transparent 100%)",
            }}
          />

          {/* Inner card sits inside the rotating layer with a 1px gap, leaving a thin animated edge visible */}
          <div className="relative m-[1.5px] rounded-[calc(1.5rem-1.5px)] bg-surface border border-line-soft overflow-hidden">
            <div
              key={TABS[active].id}
              className="p-6 md:p-10 animate-tab-content"
              role="tabpanel"
            >
              {TABS[active].content}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Vertical "rule" lines fading at top + bottom — frames the content width.
function BackgroundLines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 flex justify-center"
    >
      <div
        className="w-full max-w-7xl h-full opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, transparent 0, transparent calc((100% / 6) - 1px), rgba(0,0,0,0.05) calc((100% / 6) - 1px), rgba(0,0,0,0.05) calc(100% / 6))",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      />
    </div>
  );
}
