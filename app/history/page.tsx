"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import {
  History as HistoryIcon,
  Trash2,
  ArrowRight,
  FileText,
  Sparkles,
  Target,
  Tag,
} from "lucide-react";

// History is a unified timeline of every activity the user has done across
// every tool — generator runs, ASO Score audits, competitor analyses, and
// keyword rank checks all flow into one sorted-by-time list. Each entry
// links back to its tool with the saved snapshot pre-loaded (where the tool
// supports replay).

type ActivityKind = "generation" | "audit" | "competitor" | "keyword";

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  meta: string[];
  createdAt: string;
  href: string;
  onDelete: () => void;
};

const KIND_LABEL: Record<ActivityKind, string> = {
  generation: "Generation",
  audit: "Audit",
  competitor: "Competitor",
  keyword: "Keyword",
};

const KIND_TILE: Record<ActivityKind, string> = {
  generation: "tile-blue",
  audit: "tile-cream",
  competitor: "tile-rose",
  keyword: "tile-peach",
};

const KIND_ICON: Record<ActivityKind, typeof FileText> = {
  generation: FileText,
  audit: Sparkles,
  competitor: Target,
  keyword: Tag,
};

const FILTERS: { id: ActivityKind | "all"; label: string }[] = [
  { id: "all", label: "All activity" },
  { id: "generation", label: "Generations" },
  { id: "audit", label: "Audits" },
  { id: "competitor", label: "Competitor" },
  { id: "keyword", label: "Keyword" },
];

export default function HistoryPage() {
  const {
    user,
    loading,
    history,
    audits,
    competitors,
    keywordRanks,
    removeHistory,
    removeAudit,
    removeCompetitor,
    removeKeywordRank,
  } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  // Merge every activity stream into a single list. Sorting by createdAt
  // ISO string is fine because the strings are all the same length and lex
  // order matches chronological order for ISO-8601.
  const items: ActivityItem[] = useMemo(() => {
    const all: ActivityItem[] = [];

    history.forEach((g) => {
      const platforms = [g.android && "Play", g.ios && "iOS"].filter(Boolean).join(" + ");
      const variantCount = (g.android?.length ?? 0) + (g.ios?.length ?? 0);
      all.push({
        id: `gen-${g.id}`,
        kind: "generation",
        title: g.input.appName,
        subtitle: `${variantCount} variants · ${platforms || "—"} · ${g.input.tone}`,
        meta: [g.input.category],
        createdAt: g.createdAt,
        href: `/history/${g.id}`,
        onDelete: () => removeHistory(g.id),
      });
    });

    audits.forEach((a) => {
      all.push({
        id: `aud-${a.id}`,
        kind: "audit",
        title: a.appName || a.url,
        subtitle: `Grade ${a.grade} · ${a.score}/100`,
        meta: [
          a.source === "ios" ? "App Store" : a.source === "play" ? "Play Store" : "Unknown",
        ],
        createdAt: a.createdAt,
        href: `/score/report?url=${encodeURIComponent(a.url)}`,
        onDelete: () => removeAudit(a.id),
      });
    });

    competitors.forEach((c) => {
      all.push({
        id: `cmp-${c.id}`,
        kind: "competitor",
        title: c.targetTitle ?? c.targetUrl,
        subtitle: `${c.successfulCount}/${c.competitorCount} competitors scraped`,
        meta: [
          c.discoveryMode,
          c.country && c.country !== "auto" ? c.country.toUpperCase() : "Auto location",
        ],
        createdAt: c.createdAt,
        href: `/competitor?url=${encodeURIComponent(c.targetUrl)}&country=${c.country ?? "auto"}`,
        onDelete: () => removeCompetitor(c.id),
      });
    });

    keywordRanks.forEach((r) => {
      const storeLabel =
        r.store === "play" ? "Play Store" : r.store === "ios" ? "App Store" : "Both stores";
      all.push({
        id: `kw-${r.id}`,
        kind: "keyword",
        title: r.keyword,
        subtitle: `${storeLabel} · top ${r.limit}`,
        meta: [r.country.toUpperCase(), r.topResultsCount ? `${r.topResultsCount} results` : ""].filter(Boolean),
        createdAt: r.createdAt,
        href: `/keywords?keyword=${encodeURIComponent(r.keyword)}&country=${r.country}&lang=${r.lang}&store=${r.store}&limit=${r.limit}`,
        onDelete: () => removeKeywordRank(r.id),
      });
    });

    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [history, audits, competitors, keywordRanks, removeHistory, removeAudit, removeCompetitor, removeKeywordRank]);

  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  // Per-kind counts for the filter chips
  const counts = useMemo(() => {
    const c: Record<ActivityKind | "all", number> = {
      all: items.length,
      generation: 0,
      audit: 0,
      competitor: 0,
      keyword: 0,
    };
    items.forEach((i) => {
      c[i.kind] += 1;
    });
    return c;
  }, [items]);

  if (loading || !user) return null;

  return (
    <AppShell
      eyebrow="Workspace · History"
      title="Everything you've done"
      description="Every generation, audit, competitor analysis, and keyword check lands here — sorted newest first. Open one to view the saved snapshot."
    >
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                active
                  ? "text-white"
                  : "bg-cream-deep text-ink-muted hover:text-ink"
              }`}
              style={active ? { backgroundColor: "#2563EB" } : undefined}
            >
              {f.label}
              <span
                className={`tabular-nums text-[11px] ${
                  active ? "text-white/85" : "text-ink-faint"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card-soft p-14 text-center animate-fade-up">
          <div className="w-14 h-14 rounded-2xl tile-blue inline-flex items-center justify-center mb-4">
            <HistoryIcon size={22} strokeWidth={1.85} />
          </div>
          <p className="text-[15px] text-ink-muted mb-6 max-w-sm mx-auto">
            {filter === "all"
              ? "No activity yet. Run any tool — generator, score checker, competitor watch, keyword research — and it'll land here."
              : `No ${KIND_LABEL[filter as ActivityKind].toLowerCase()} activity yet.`}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            Back to dashboard
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <div
                key={item.id}
                className="group card-soft p-5 animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${KIND_TILE[item.kind]} flex items-center justify-center shrink-0`}>
                    <Icon size={16} strokeWidth={1.85} />
                  </div>
                  <Link href={item.href} className="flex-1 min-w-0 block">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${KIND_TILE[item.kind]}`}>
                        {KIND_LABEL[item.kind]}
                      </span>
                      {item.meta.map((m, idx) => (
                        <span key={idx} className="text-[11px] text-ink-faint">
                          {m}
                        </span>
                      ))}
                    </div>
                    <p className="text-[16px] font-semibold text-ink truncate">{item.title}</p>
                    <p className="text-[12px] text-ink-muted truncate mt-0.5">{item.subtitle}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-ink-faint tabular-nums hidden sm:inline">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={item.onDelete}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
