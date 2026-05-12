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

const TILE_FOR_LABEL: Record<string, string> = {
  Generations: "tile-blue",
  "Saved drafts": "tile-lilac",
  Apps: "tile-mint",
  "ASO Score": "tile-cream",
};

export default function DashboardPage() {
  const { user, loading, apps, savedGenerations, history, audits } = useAuth();
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

    const latestAudit = audits[0];
    const auditsThisWeek = countSince(audits, 7);

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
        value: latestAudit ? latestAudit.score : "—",
        sub: latestAudit
          ? `Grade ${latestAudit.grade} · ${auditsThisWeek} audit${auditsThisWeek === 1 ? "" : "s"} this week`
          : "Run your first audit",
        icon: Sparkles,
        muted: !latestAudit,
      },
    ];
  }, [history, savedGenerations, apps, audits]);

  const recent = history.slice(0, 5);

  if (loading || !user) return null;

  return (
    <AppShell
      eyebrow="Workspace · Overview"
      title={`Hello, ${user.firstName || "there"}.`}
      description="What's moving across your apps, variants, and tools today."
      actions={
        <Link
          href="/generator"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
        >
          <Wand2 size={15} />
          New generation
        </Link>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const tile = TILE_FOR_LABEL[stat.label] ?? "tile-blue";
          return (
            <div key={stat.label} className="card-soft p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="eyebrow text-[11px] tracking-[0.15em]">{stat.label}</p>
                <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center`}>
                  <Icon size={16} strokeWidth={1.85} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-[36px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${stat.muted ? "text-ink-faint" : ""}`}
                  style={!stat.muted ? { color: "#0B3D7A" } : undefined}
                >
                  {stat.value}
                </span>
                {typeof stat.delta === "number" && stat.delta !== 0 && (
                  <span
                    className={`text-[12px] font-semibold tabular-nums ${
                      stat.delta > 0 ? "text-green" : "text-warn"
                    }`}
                  >
                    {stat.delta > 0 ? "+" : ""}
                    {stat.delta}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-ink-muted mt-2">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column: activity feed + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <section className="lg:col-span-2 card-soft overflow-hidden">
          <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg tile-lilac flex items-center justify-center">
                <Activity size={13} strokeWidth={2} />
              </div>
              <h2 className="text-[15px] font-semibold text-ink">Recent activity</h2>
            </div>
            <Link
              href="/history"
              className="text-[12px] font-semibold text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              View all
              <ArrowUpRight size={13} />
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="w-12 h-12 rounded-2xl tile-blue inline-flex items-center justify-center mb-4">
                <FileText size={20} strokeWidth={1.85} />
              </div>
              <p className="text-[14px] text-ink-muted mb-5">No activity yet — generate something to get started.</p>
              <Link
                href="/generator"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
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
                      className="flex items-center gap-4 px-6 py-4 hover:bg-cream transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
                        <FileText size={15} strokeWidth={1.85} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ink truncate">
                          {gen.input.appName}
                        </p>
                        <p className="text-[12px] text-ink-faint truncate mt-0.5">
                          {variantCount} variants · {platforms.join(" + ")} · {gen.input.tone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-faint tabular-nums shrink-0">
                        <Clock size={11} />
                        {relativeTime(gen.createdAt)}
                      </div>
                      <ArrowRight size={15} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="card-soft overflow-hidden">
          <header className="flex items-center px-6 h-14 border-b border-line-soft">
            <h2 className="text-[15px] font-semibold text-ink">Quick actions</h2>
          </header>
          <div className="p-3 space-y-1">
            <QuickAction href="/generator" icon={Wand2} label="Generate ASO copy" hint="Title + description" tile="tile-blue" />
            <QuickAction href="/library" icon={Bookmark} label="Open library" hint="Your saved drafts" tile="tile-lilac" />
            <QuickAction href="/history" icon={Clock} label="View history" hint="Auto-saved generations" tile="tile-mint" />
            <QuickAction href="/score" icon={Sparkles} label="Score a listing" hint="Audit any app" tile="tile-cream" />
          </div>
        </aside>
      </div>

      {/* Recent audits */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
            Recent audits
          </h2>
          <span className="text-[13px] text-ink-faint tabular-nums">{audits.length}</span>
        </div>
        {audits.length === 0 ? (
          <div className="rounded-2xl bg-cream-deep border border-dashed border-line px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl tile-cream inline-flex items-center justify-center mb-3">
              <Sparkles size={20} strokeWidth={1.85} />
            </div>
            <p className="text-[14px] text-ink-muted mb-5">
              You haven&apos;t audited a listing yet. Run the Score Checker to see your first report.
            </p>
            <Link
              href="/score"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors"
            >
              <Sparkles size={14} />
              Score a listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {audits.slice(0, 6).map((a) => {
              const reportHref = `/score/report?url=${encodeURIComponent(a.url)}`;
              const gradeTile =
                a.grade === "A" ? "tile-mint" :
                a.grade === "B" ? "tile-blue" :
                a.grade === "C" ? "tile-cream" :
                a.grade === "D" ? "tile-rose" : "tile-peach";
              return (
                <Link key={a.id} href={reportHref} className="group card-soft p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl ${gradeTile} flex items-center justify-center font-bold text-[14px]`}>
                      {a.grade}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: "#0B3D7A" }}>
                        {a.score}
                      </span>
                      <span className="text-[11px] text-ink-faint">/100</span>
                    </div>
                  </div>
                  <p className="text-[14px] font-semibold text-ink truncate">
                    {a.appName || a.source === "ios" ? "App Store listing" : a.source === "play" ? "Play Store listing" : "Listing"}
                  </p>
                  <p className="text-[11px] text-ink-faint truncate mt-1 font-mono">{a.url}</p>
                  <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                    <span className="capitalize">
                      {a.source === "ios" ? "App Store" : a.source === "play" ? "Google Play" : "Unknown"}
                    </span>
                    <span className="tabular-nums">{relativeTime(a.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Apps */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
            Your apps
          </h2>
          <span className="text-[13px] text-ink-faint tabular-nums">{apps.length}</span>
        </div>
        {apps.length === 0 ? (
          <div className="rounded-2xl bg-cream-deep border border-dashed border-line px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl tile-mint inline-flex items-center justify-center mb-3">
              <AppWindow size={20} strokeWidth={1.85} />
            </div>
            <p className="text-[14px] text-ink-muted">Apps you save generations for show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className="group card-soft p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: app.icon }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink truncate">{app.name}</p>
                    <p className="text-[11px] text-ink-faint">{app.category}</p>
                  </div>
                  <ArrowUpRight size={15} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4 pt-4 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint tabular-nums">
                  <span>{app.generations.length} generation{app.generations.length === 1 ? "" : "s"}</span>
                  <span>{relativeTime(app.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tools */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
            Tools
          </h2>
          <span className="text-[13px] text-ink-faint">2 live · 4 coming</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ToolCard href="/generator" icon={Wand2} title="ASO Generator" desc="Three angle variants per platform from one brief." status="live" tile="tile-blue" />
          <ToolCard href="/score" icon={Sparkles} title="ASO Score" desc="Audit any listing against the ASO playbook." status="live" tile="tile-lilac" />
          <ToolCard href="/features/screenshots" icon={ImageIcon} title="Screenshots" desc="Auto-generate store screenshots from your UI." status="soon" tile="tile-mint" />
          <ToolCard href="/features/reddit" icon={MessageSquare} title="Reddit Posts" desc="Subreddit-tuned launch posts that don't get nuked." status="soon" tile="tile-cream" />
          <ToolCard href="/competitor" icon={Target} title="Competitor Watch" desc="Find competitors, compare ratings, keywords, and char usage." status="live" tile="tile-rose" />
          <ToolCard href="/features/keywords" icon={Tag} title="Keyword Research" desc="Volume, difficulty, and competitor coverage." status="soon" tile="tile-peach" />
        </div>
      </section>
    </AppShell>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  tile,
}: {
  href: string;
  icon: typeof Wand2;
  label: string;
  hint: string;
  tile: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream transition-colors group"
    >
      <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center shrink-0`}>
        <Icon size={15} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-ink truncate">{label}</p>
        <p className="text-[11px] text-ink-faint truncate">{hint}</p>
      </div>
      <ArrowRight size={14} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function ToolCard({
  href,
  icon: Icon,
  title,
  desc,
  status,
  tile,
}: {
  href: string;
  icon: typeof Wand2;
  title: string;
  desc: string;
  status: "live" | "soon";
  tile: string;
}) {
  const isSoon = status === "soon";
  return (
    <Link href={href} className="group card-soft p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${tile} flex items-center justify-center`}>
          <Icon size={18} strokeWidth={1.85} />
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${
            isSoon ? "bg-cream-deep text-ink-faint" : "text-white"
          }`}
          style={!isSoon ? { backgroundColor: "#10B981" } : undefined}
        >
          {isSoon ? "Soon" : "Live"}
        </span>
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">{desc}</p>
      {!isSoon && (
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold mt-4" style={{ color: "#0B3D7A" }}>
          Open <ArrowRight size={13} />
        </span>
      )}
    </Link>
  );
}
