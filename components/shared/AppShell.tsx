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
      { href: "/competitor", label: "Competitor Watch", icon: Target },
      { href: "/keywords", label: "Keyword Research", icon: Tag },
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
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
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
    <div className="min-h-screen bg-white">
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-5 h-16 bg-white border-b border-line-soft">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-ink"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-night/40" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-[300px] bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 h-16 border-b border-line-soft">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="p-2 text-ink">
                <X size={22} />
              </button>
            </div>
            <SidebarBody onNavigate={() => setMobileOpen(false)} initials={initials} userName={userName} userEmail={userEmail} signOut={signOut} />
          </aside>
        </div>
      )}

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 md:h-screen md:sticky md:top-0 bg-white border-r border-line-soft">
          <div className="px-6 h-20 flex items-center">
            <Logo />
          </div>
          <SidebarBody initials={initials} userName={userName} userEmail={userEmail} signOut={signOut} />
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Desktop top bar */}
          <header className="hidden md:flex sticky top-0 z-30 h-20 items-center justify-between gap-4 px-10 bg-white border-b border-line-soft">
            <div className="flex items-center gap-2.5 text-[14px]">
              <span className="font-medium text-ink-faint">outreach</span>
              {title && (
                <>
                  <span className="text-ink-faint">/</span>
                  <span className="text-ink font-semibold">{title}</span>
                </>
              )}
            </div>
            <GlobalSearch />
          </header>

          {/* Page header */}
          {(title || actions) && (
            <div className="px-6 md:px-10 pt-12 pb-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="min-w-0 max-w-3xl">
                  {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
                  {title && (
                    <h1
                      className="text-[36px] lg:text-[48px] font-semibold leading-[1.05] tracking-[-0.02em]"
                      style={{ color: "#0B3D7A" }}
                    >
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-[15px] lg:text-[16px] text-ink-muted mt-4 max-w-2xl leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
            </div>
          )}

          <main className="px-6 md:px-10 pb-16">{children}</main>
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
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-7">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2">
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
                      className={`flex items-center gap-3 px-3 h-10 rounded-xl text-[14px] transition-colors ${
                        active
                          ? "tile-blue font-semibold"
                          : "text-ink-muted hover:text-ink hover:bg-cream"
                      }`}
                    >
                      <Icon size={16} className="shrink-0" strokeWidth={active ? 2.25 : 1.85} />
                      <span className="flex-1 truncate">{link.label}</span>
                      {link.status === "soon" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cream-deep text-ink-faint">
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
      <div className="px-4 py-4 border-t border-line-soft">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
            style={{ backgroundColor: "#0B3D7A" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate leading-tight">{userName || "—"}</p>
            <p className="text-[11px] text-ink-faint truncate leading-tight">{userEmail}</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={14} />
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

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

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
      <div className="flex items-center gap-2.5 px-4 h-11 rounded-full bg-cream-deep border border-transparent focus-within:border-ink-faint transition-colors w-[360px]">
        <Search size={15} className="text-ink-faint" />
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
          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
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
        <div className="absolute right-0 top-[calc(100%+8px)] w-[420px] max-h-[440px] overflow-y-auto rounded-2xl bg-white border border-line-soft shadow-xl">
          {results.length === 0 ? (
            <div className="px-5 py-8 text-[14px] text-ink-muted text-center">
              No matches for &ldquo;{q}&rdquo;.
            </div>
          ) : (
            <div className="py-2">
              {(() => {
                let runningIndex = 0;
                return grouped.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="mb-1">
                    <p className="px-4 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
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
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            active ? "bg-cream-deep" : ""
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg tile-blue flex items-center justify-center shrink-0">
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-ink truncate">{hit.title}</p>
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
