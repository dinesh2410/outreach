import Link from "next/link";
import { Logo } from "./Logo";

type Col = { title: string; links: { label: string; href: string }[] };

const COLUMNS: Col[] = [
  {
    title: "Product",
    links: [
      { label: "ASO Generator", href: "/generator" },
      { label: "Score Checker", href: "/score" },
      { label: "Reddit Demand", href: "/reddit" },
      { label: "Competitor Watch", href: "/competitor" },
      { label: "Keyword Research", href: "/keywords" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "About", href: "/about" },
      { label: "Support", href: "mailto:support@testerscommunity.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink border-t border-white/10">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <div className="flex items-start justify-between mb-8 sm:mb-12 flex-wrap gap-5 sm:gap-6">
          <div className="[&_svg_rect]:fill-white [&_span]:!text-white">
            <Logo />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[14px] sm:text-[15px] font-semibold text-white/80 mb-4 sm:mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3 sm:space-y-3.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] sm:text-[14px] text-white/40 hover:text-white/70 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[12px] text-white/30">
            &copy; 2026 ReachFront &middot; Made for indie makers.
          </p>
          <p className="text-[12px] text-white/30">
            hello@reachfront.app
          </p>
        </div>
      </div>
    </footer>
  );
}
