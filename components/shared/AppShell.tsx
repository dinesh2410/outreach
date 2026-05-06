"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Wand2,
  History,
  BookOpen,
  Settings,
  LogOut,
  Search,
  Image as ImageIcon,
  MessageSquare,
  Target,
  Tag,
  Sparkles,
  Menu,
  X,
  FileText,
  AppWindow,
  Bookmark,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import type { GenerationResult, AppEntry } from "@/lib/types";

// --- nav model -----------------------------------------------------------

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  status?: "soon";
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/history", label: "History", icon: History },
      { href: "/library", label: "Library", icon: BookOpen },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/generator", label: "ASO Generator", icon: Wand2 },
      { href: "/score", label: "ASO Score", icon: Sparkles },
      { href: "/features/screenshots", label: "Screenshots", icon: ImageIcon, status: "soon" },
      { href: "/features/reddit", label: "Reddit Posts", icon: MessageSquare, status: "soon" },
      { href: "/features/competitor", label: "Competitor Watch", icon: Target, status: "soon" },
      { href: "/features/keywords", label: "Keyword Research", icon: Tag, status: "soon" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// --- shell ---------------------------------------------------------------

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "—";
  const userName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const userEmail = user?.email ?? "";

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-cream/90 backdrop-blur-md border-b border-line-soft">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-ink-muted"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-night/40" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-[280px] bg-paper border-r border-line flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-line-soft">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="p-2 text-ink-muted">
                <X size={20} />
              </button>
            </div>
            <SidebarBody onNavigate={() => setMobileOpen(false)} initials={initials} userName={userName} userEmail={userEmail} signOut={signOut} />
          </aside>
        </div>
      )}

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-[244px] md:shrink-0 md:h-screen md:sticky md:top-0 bg-paper border-r border-line">
          <div className="px-5 h-14 flex items-center border-b border-line-soft">
            <Logo />
          </div>
          <SidebarBody initials={initials} userName={userName} userEmail={userEmail} signOut={signOut} />
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Desktop top bar */}
          <header className="hidden md:flex sticky top-0 z-30 h-14 items-center justify-between gap-4 px-8 bg-cream/85 backdrop-blur-md border-b border-line-soft">
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="font-medium text-ink">outreach</span>
              {title && (
                <>
                  <span className="text-ink-faint">/</span>
                  <span className="text-ink">{title}</span>
                </>
              )}
            </div>
            <GlobalSearch />
          </header>

          {/* Page header */}
          {(title || actions) && (
            <div className="px-6 md:px-8 pt-8 pb-6 border-b border-line-soft">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                  {title && <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">{title}</h1>}
                  {description && <p className="text-sm text-ink-muted mt-1.5">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
            </div>
          )}

          <main className="px-6 md:px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

// --- sidebar body --------------------------------------------------------

function SidebarBody({
  onNavigate,
  initials,
  userName,
  userEmail,
  signOut,
}: {
  onNavigate?: () => void;
  initials: string;
  userName: string;
  userEmail: string;
  signOut: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-1">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] transition-colors ${
                        active
                          ? "bg-cream-deep text-ink font-medium"
                          : "text-ink-muted hover:text-ink hover:bg-cream"
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="flex-1 truncate">{link.label}</span>
                      {link.status === "soon" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream-deep text-ink-faint border border-line">
                          Soon
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="px-3 py-3 border-t border-line-soft">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-ink truncate leading-tight">{userName || "—"}</p>
            <p className="text-[11px] text-ink-faint truncate leading-tight">{userEmail}</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-cream transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

// --- global search -------------------------------------------------------

type SearchHit = {
  href: string;
  title: string;
  subtitle: string;
  group: "Apps" | "History" | "Library" | "Pages";
  icon: typeof FileText;
};

function buildHits(history: GenerationResult[], saved: GenerationResult[], apps: AppEntry[]): SearchHit[] {
  const hits: SearchHit[] = [];

  apps.forEach((a) =>
    hits.push({
      href: `/apps/${a.id}`,
      title: a.name,
      subtitle: `${a.category} · ${a.generations.length} generation${a.generations.length === 1 ? "" : "s"}`,
      group: "Apps",
      icon: AppWindow,
    })
  );

  history.forEach((g) => {
    const platforms = [g.android && "Play", g.ios && "iOS"].filter(Boolean).join(" + ");
    hits.push({
      href: `/history/${g.id}`,
      title: g.input.appName,
      subtitle: `${platforms} · ${g.input.tone} · ${new Date(g.createdAt).toLocaleDateString()}`,
      group: "History",
      icon: FileText,
    });
  });

  saved.forEach((g) => {
    const variant = g.android?.[0] || g.ios?.[0];
    hits.push({
      href: `/library`,
      title: variant?.title || g.input.appName,
      subtitle: `${g.input.appName} · ${g.input.tone}`,
      group: "Library",
      icon: Bookmark,
    });
  });

  ["Dashboard", "Generator", "History", "Library", "Settings"].forEach((label) => {
    hits.push({
      href: `/${label.toLowerCase()}`,
      title: label,
      subtitle: "Page",
      group: "Pages",
      icon: LayoutDashboard,
    });
  });

  return hits;
}

function GlobalSearch() {
  const router = useRouter();
  const { history, savedGenerations, apps } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const allHits = useMemo(() => buildHits(history, savedGenerations, apps), [history, savedGenerations, apps]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allHits
      .filter((h) => h.title.toLowerCase().includes(term) || h.subtitle.toLowerCase().includes(term))
      .slice(0, 12);
  }, [q, allHits]);

  // Reset highlight when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Outside click closes
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) go(results[activeIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Group results by group label, preserving the original order
  const grouped = useMemo(() => {
    const map = new Map<SearchHit["group"], SearchHit[]>();
    results.forEach((h) => {
      const arr = map.get(h.group) ?? [];
      arr.push(h);
      map.set(h.group, arr);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <div ref={wrapRef} className="relative hidden lg:block">
      <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface border border-line focus-within:border-ink-faint transition-colors w-[320px]">
        <Search size={13} className="text-ink-faint" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search apps, history, library…"
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="p-0.5 text-ink-faint hover:text-ink"
            aria-label="Clear"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && q && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[420px] max-h-[440px] overflow-y-auto rounded-xl bg-paper border border-line shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">
              No matches for &ldquo;{q}&rdquo;.
            </div>
          ) : (
            <div className="py-1.5">
              {(() => {
                let runningIndex = 0;
                return grouped.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="mb-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {groupLabel}
                    </p>
                    {items.map((hit) => {
                      const Icon = hit.icon;
                      const myIndex = runningIndex++;
                      const active = myIndex === activeIndex;
                      return (
                        <button
                          key={`${hit.group}-${hit.href}-${hit.title}-${myIndex}`}
                          onMouseEnter={() => setActiveIndex(myIndex)}
                          onClick={() => go(hit.href)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                            active ? "bg-cream" : ""
                          }`}
                        >
                          <div className="w-7 h-7 rounded-md bg-cream-deep border border-line flex items-center justify-center shrink-0">
                            <Icon size={13} className="text-ink-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{hit.title}</p>
                            <p className="text-[11px] text-ink-faint truncate">{hit.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
