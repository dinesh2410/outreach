import Link from "next/link";
import { Logo } from "./Logo";

type Col = { title: string; links: { label: string; href: string }[] };

const COLUMNS: Col[] = [
  {
    title: "Product",
    links: [
      { label: "Description writer", href: "/features" },
      { label: "Score checker", href: "/score" },
      { label: "Keyword research", href: "/features" },
      { label: "Library", href: "/library" },
      { label: "Pricing", href: "/pricing" },
      { label: "Roadmap", href: "/about" },
    ],
  },
  {
    title: "Compare",
    links: [
      { label: "vs. blank page", href: "/features" },
      { label: "vs. ChatGPT prompts", href: "/features" },
      { label: "vs. AppFollow", href: "/features" },
      { label: "vs. Sensor Tower", href: "/features" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "Playbooks", href: "/about" },
      { label: "ASO glossary", href: "/about" },
      { label: "Support", href: "mailto:support@testerscommunity.com" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Indie collective", href: "/about" },
      { label: "Affiliates", href: "/about" },
      { label: "Studios", href: "/features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "mailto:support@testerscommunity.com" },
      { label: "Privacy", href: "/about" },
      { label: "Terms", href: "/about" },
    ],
  },
];

const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: "X",
    href: "#",
    path: "M18.244 2H21.5l-7.31 8.36L23 22h-6.766l-5.295-6.93L4.866 22H1.6l7.82-8.94L1 2h6.92l4.787 6.32L18.244 2Zm-1.19 18h1.86L7.07 4H5.08l11.974 16Z",
  },
  {
    label: "LinkedIn",
    href: "#",
    path: "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z",
  },
  {
    label: "GitHub",
    href: "#",
    path: "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.07 0 4.4-2.68 5.37-5.24 5.66.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z",
  },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-line-soft">
      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <div className="flex items-start justify-between mb-12 flex-wrap gap-6">
          <Logo />
          <div className="flex items-center gap-5">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="text-ink hover:opacity-60 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[15px] font-semibold text-ink mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-ink-muted hover:text-ink transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-line-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-ink-faint">
            &copy; 2026 Outreach &middot; Made for indie makers.
          </p>
          <p className="text-[12px] text-ink-faint">
            hello@outreach.app
          </p>
        </div>
      </div>
    </footer>
  );
}
