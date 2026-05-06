"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import {
  Wand2,
  AppWindow,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Image as ImageIcon,
  MessageSquare,
  Target,
  Tag,
  Bookmark,
  Clock,
  Activity,
} from "lucide-react";

// --- helpers --------------------------------------------------------------

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function countSince(items: { createdAt: string }[], days: number): number {
  const since = Date.now() - days * 86_400_000;
  return items.filter((i) => new Date(i.createdAt).getTime() >= since).length;
}

// --- page ----------------------------------------------------------------

export default function DashboardPage() {
  const { user, loading, apps, savedGenerations, history } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  const stats = useMemo(() => {
    const generationsThisWeek = countSince(history, 7);
    const generationsLastWeek =
      history.filter((g) => {
        const t = new Date(g.createdAt).getTime();
        return t >= Date.now() - 14 * 86_400_000 && t < Date.now() - 7 * 86_400_000;
      }).length;
    const delta = generationsThisWeek - generationsLastWeek;

    return [
      {
        label: "Generations",
        value: history.length,
        sub: `${generationsThisWeek} this week`,
        delta,
        icon: FileText,
      },
      {
        label: "Saved drafts",
        value: savedGenerations.length,
        sub: `${countSince(savedGenerations, 7)} this week`,
        icon: Bookmark,
      },
      {
        label: "Apps",
        value: apps.length,
        sub: apps.length === 0 ? "No apps yet" : `${apps.length} tracked`,
        icon: AppWindow,
      },
      {
        label: "ASO Score",
        value: "—",
        sub: "Coming soon",
        icon: Sparkles,
        muted: true,
      },
    ];
  }, [history, savedGenerations, apps]);

  const recent = history.slice(0, 5);

  if (loading || !user) return null;

  return (
    <AppShell
      title={`Hello, ${user.firstName || "there"}.`}
      description="Here's what's happening across your apps and tools."
      actions={
        <Link
          href="/generator"
          className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Wand2 size={14} />
          New generation
        </Link>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 rounded-xl bg-paper border border-line hover:border-ink-faint transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  {stat.label}
                </p>
                <Icon size={14} className="text-ink-faint" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-semibold tabular-nums ${stat.muted ? "text-ink-faint" : "text-ink"}`}>
                  {stat.value}
                </span>
                {typeof stat.delta === "number" && stat.delta !== 0 && (
                  <span
                    className={`text-[11px] font-medium tabular-nums ${
                      stat.delta > 0 ? "text-green" : "text-warn"
                    }`}
                  >
                    {stat.delta > 0 ? "+" : ""}
                    {stat.delta}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column: activity feed + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        {/* Recent activity */}
        <section className="lg:col-span-2 rounded-xl bg-paper border border-line">
          <header className="flex items-center justify-between px-5 h-12 border-b border-line-soft">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-ink-faint" />
              <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
            </div>
            <Link
              href="/history"
              className="text-xs text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              View all
              <ArrowUpRight size={12} />
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText size={20} className="text-ink-faint mx-auto mb-3" />
              <p className="text-sm text-ink-muted mb-4">No activity yet — generate something to get started.</p>
              <Link
                href="/generator"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-accent transition-colors"
              >
                Open generator <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {recent.map((gen) => {
                const platforms: string[] = [];
                if (gen.android) platforms.push("Play");
                if (gen.ios) platforms.push("iOS");
                const variantCount = (gen.android?.length ?? 0) + (gen.ios?.length ?? 0);
                return (
                  <li key={gen.id}>
                    <Link
                      href={`/history/${gen.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-cream-deep border border-line flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-ink-faint" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {gen.input.appName}
                        </p>
                        <p className="text-xs text-ink-faint truncate">
                          {variantCount} variants · {platforms.join(" + ")} · {gen.input.tone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-faint tabular-nums shrink-0">
                        <Clock size={11} />
                        {relativeTime(gen.createdAt)}
                      </div>
                      <ArrowRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <aside className="rounded-xl bg-paper border border-line">
          <header className="flex items-center px-5 h-12 border-b border-line-soft">
            <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
          </header>
          <div className="p-3 space-y-1">
            <QuickAction href="/generator" icon={Wand2} label="Generate ASO copy" hint="Title + description" />
            <QuickAction href="/library" icon={Bookmark} label="Open library" hint="Your saved drafts" />
            <QuickAction href="/history" icon={Clock} label="View history" hint="Auto-saved generations" />
            <QuickAction href="/score" icon={Sparkles} label="Score a listing" hint="Audit any app" />
          </div>
        </aside>
      </div>

      {/* Apps */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Your apps</h2>
          <span className="text-xs text-ink-faint tabular-nums">{apps.length}</span>
        </div>
        {apps.length === 0 ? (
          <div className="rounded-xl bg-paper border border-dashed border-line px-6 py-10 text-center">
            <AppWindow size={20} className="text-ink-faint mx-auto mb-2" />
            <p className="text-sm text-ink-muted">Apps you save generations for show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {apps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className="group p-4 rounded-xl bg-paper border border-line hover:border-ink-faint transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: app.icon }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{app.name}</p>
                    <p className="text-[11px] text-ink-faint">{app.category}</p>
                  </div>
                  <ArrowUpRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint tabular-nums">
                  <span>{app.generations.length} generation{app.generations.length === 1 ? "" : "s"}</span>
                  <span>{relativeTime(app.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tools */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Tools</h2>
          <span className="text-xs text-ink-faint">2 live · 4 coming</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ToolCard href="/generator" icon={Wand2} title="ASO Generator" desc="Three angle variants per platform from one brief." status="live" />
          <ToolCard href="/score" icon={Sparkles} title="ASO Score" desc="Audit any listing against the ASO playbook." status="live" />
          <ToolCard href="/features/screenshots" icon={ImageIcon} title="Screenshots" desc="Auto-generate store screenshots from your UI." status="soon" />
          <ToolCard href="/features/reddit" icon={MessageSquare} title="Reddit Posts" desc="Subreddit-tuned launch posts that don't get nuked." status="soon" />
          <ToolCard href="/features/competitor" icon={Target} title="Competitor Watch" desc="Track competitor listings, ratings, and updates." status="soon" />
          <ToolCard href="/features/keywords" icon={Tag} title="Keyword Research" desc="Volume, difficulty, and competitor coverage." status="soon" />
        </div>
      </section>
    </AppShell>
  );
}

// --- subcomponents -------------------------------------------------------

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: typeof Wand2;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-cream-deep border border-line flex items-center justify-center shrink-0">
        <Icon size={14} className="text-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{label}</p>
        <p className="text-[11px] text-ink-faint truncate">{hint}</p>
      </div>
      <ArrowRight size={13} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function ToolCard({
  href,
  icon: Icon,
  title,
  desc,
  status,
}: {
  href: string;
  icon: typeof Wand2;
  title: string;
  desc: string;
  status: "live" | "soon";
}) {
  const isSoon = status === "soon";
  return (
    <Link
      href={href}
      className={`group p-4 rounded-xl bg-paper border transition-colors ${
        isSoon ? "border-line hover:border-line" : "border-line hover:border-ink-faint"
      }`}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="w-9 h-9 rounded-lg bg-cream-deep border border-line flex items-center justify-center">
          <Icon size={16} className={isSoon ? "text-ink-faint" : "text-ink"} />
        </div>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider ${
            isSoon ? "bg-cream-deep text-ink-faint border border-line" : "bg-green/10 text-green"
          }`}
        >
          {isSoon ? "Soon" : "Live"}
        </span>
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{desc}</p>
      {!isSoon && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink mt-3 group-hover:text-accent transition-colors">
          Open <ArrowRight size={12} />
        </span>
      )}
    </Link>
  );
}
