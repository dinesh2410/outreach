"use client";

import { MockASOResults } from "../mocks/MockASOResults";
import { MockScreenshot } from "../mocks/MockScreenshot";
import { MockRedditReply } from "../mocks/MockRedditReply";
import { MockCompetitor } from "../mocks/MockCompetitor";
import { MockKeywords } from "../mocks/MockKeywords";
import { useInView } from "@/lib/useInView";

const TOOLS = [
  {
    name: "ASO Descriptions",
    status: "Live",
    span: "md:col-span-2",
    mock: <MockASOResults compact />,
  },
  {
    name: "Screenshot Generator",
    status: "Coming soon",
    span: "",
    mock: <MockScreenshot />,
  },
  {
    name: "Reddit Replies",
    status: "Coming soon",
    span: "",
    mock: <MockRedditReply />,
  },
  {
    name: "Competitor Analysis",
    status: "Coming soon",
    span: "",
    mock: <MockCompetitor />,
  },
  {
    name: "Keyword Research",
    status: "Coming soon",
    span: "",
    mock: <MockKeywords />,
  },
];

export function BentoTools() {
  const { ref, inView } = useInView();

  return (
    <section className="py-24 md:py-32 bg-cream-deep" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-up" : "opacity-0"}`}>
          <p className="text-xs text-ink-faint uppercase tracking-[0.2em] mb-4">
            The toolkit
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight">
            Five tools, one platform.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOOLS.map((tool, i) => (
            <div
              key={tool.name}
              className={`${tool.span} rounded-3xl overflow-hidden bg-surface border border-line-soft p-6 ${
                inView ? "animate-fade-up" : "opacity-0"
              }`}
              style={{ animationDelay: inView ? `${i * 100}ms` : undefined }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">{tool.name}</h3>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    tool.status === "Live"
                      ? "bg-ink text-white"
                      : "bg-cream text-ink-muted border border-line-soft"
                  }`}
                >
                  {tool.status}
                </span>
              </div>
              <div className="pointer-events-none">{tool.mock}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
