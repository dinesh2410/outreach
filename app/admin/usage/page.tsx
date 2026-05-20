"use client";

// Admin-only usage dashboard.
//
// Aggregates every /users/{uid}/usage/{genId} record via a collectionGroup
// query, then renders cost / tokens / generation counts and a 14-day trend
// chart. Gated on the admin email — non-admin users are redirected to
// /dashboard so this page never flashes data to anyone else, and Firestore
// rules deny the underlying read regardless of the route check.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchAllUsage } from "@/lib/firestore";
import type { UsageRecord } from "@/lib/types";
import {
  DollarSign,
  Sparkles,
  Activity,
  Gauge,
  RefreshCcw,
  AlertCircle,
  Users,
  Wand2,
  HelpCircle,
  MessageSquare,
  Tag,
  Target,
  ChartBar,
} from "@/components/shared/Icon";
import type { UsageTool } from "@/lib/types";
import { isAdmin } from "@/lib/admins";

export default function AdminUsagePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<UsageRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Email gate. Firestore rules also enforce this, but the redirect keeps
  // the page from rendering a spinner for non-admins who land here by
  // accident.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth?next=/admin/usage");
      return;
    }
    if (!isAdmin(user.email)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const all = await fetchAllUsage(1000);
      setRecords(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin(user?.email)) load();
  }, [user]);

  if (loading || !user || !isAdmin(user.email)) return null;

  return (
    <AppShell
      eyebrow="Admin · Usage monitoring"
      title="Usage & cost"
      description="Per-generation token consumption and estimated Gemini cost across all users."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60"
        >
          <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {error && (
        <div className="card-soft p-5 mb-4 flex items-start gap-3 border border-rose-200/50">
          <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-ink">Could not load usage</p>
            <p className="text-[13px] text-ink-muted mt-1">{error}</p>
            <p className="text-[12px] text-ink-faint mt-2">
              If this is the first time loading, you may need to (1) republish firestore.rules to allow admin reads on the usage subcollection, and (2) create a collectionGroup index on <code className="px-1 py-0.5 bg-line-soft rounded">usage</code> ordered by <code className="px-1 py-0.5 bg-line-soft rounded">createdAt desc</code>.
            </p>
          </div>
        </div>
      )}

      {!records ? (
        <div className="card-soft p-10 text-center text-ink-faint text-[14px]">Loading usage…</div>
      ) : records.length === 0 ? (
        <div className="card-soft p-10 text-center">
          <p className="text-[15px] text-ink-muted">No usage recorded yet.</p>
          <p className="text-[13px] text-ink-faint mt-1">Records appear here after the first /api/generate call.</p>
        </div>
      ) : (
        <UsageBody records={records} />
      )}
    </AppShell>
  );
}

// --- Body ----------------------------------------------------------------

function UsageBody({ records }: { records: UsageRecord[] }) {
  // Stat cards — totals across the loaded window (most-recent 1000 records).
  // For long-running deployments this is effectively "all-time" until volume
  // outgrows the read budget; can be parameterised later.
  const stats = useMemo(() => {
    const last30 = filterSince(records, 30);
    const last7 = filterSince(records, 7);
    const gens30 = last30.filter((r) => r.tool === "generate" || !r.tool).length;
    return {
      costTotal: sum(records, (r) => r.estimatedCostUsd),
      cost30: sum(last30, (r) => r.estimatedCostUsd),
      cost7: sum(last7, (r) => r.estimatedCostUsd),
      tokensTotal: sum(records, (r) => r.totalTokens),
      tokens30: sum(last30, (r) => r.totalTokens),
      gens30,
      callsTotal: records.length,
      avgCost: last30.length ? sum(last30, (r) => r.estimatedCostUsd) / last30.length : 0,
      uniqueUsers: new Set(records.map((r) => r.userId)).size,
    };
  }, [records]);

  // 14-day daily totals for the trend chart. Records are already sorted
  // newest-first by fetchAllUsage's orderBy clause.
  const dailyBars = useMemo(() => buildDailyBars(records, 14), [records]);
  const toolBreakdown = useMemo(() => buildToolBreakdown(records), [records]);
  const userBreakdown = useMemo(() => buildUserBreakdown(records), [records]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={<DollarSign size={16} strokeWidth={1.85} />}
          tile="tile-mint"
          label="Cost · all time"
          value={`$${stats.costTotal.toFixed(3)}`}
          sub={`$${stats.cost30.toFixed(3)} last 30 days`}
        />
        <StatTile
          icon={<Sparkles size={16} strokeWidth={1.85} />}
          tile="tile-blue"
          label="Tokens · all time"
          value={formatCompact(stats.tokensTotal)}
          sub={`${stats.callsTotal} API call${stats.callsTotal === 1 ? "" : "s"}`}
        />
        <StatTile
          icon={<Gauge size={16} strokeWidth={1.85} />}
          tile="tile-lilac"
          label="Avg cost / call"
          value={`$${stats.avgCost.toFixed(4)}`}
          sub={`last 30 days`}
        />
        <StatTile
          icon={<Users size={16} strokeWidth={1.85} />}
          tile="tile-peach"
          label="Active users"
          value={String(stats.uniqueUsers)}
          sub={`unique in the window`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <section className="lg:col-span-2 card-soft overflow-hidden">
          <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
            <h2 className="text-[15px] font-semibold text-ink">Daily cost — last 14 days</h2>
            <span className="text-[12px] text-ink-faint tabular-nums">
              ${sum(dailyBars, (b) => b.cost).toFixed(3)} total
            </span>
          </header>
          <div className="p-6">
            <DailyBarChart bars={dailyBars} />
          </div>
        </section>

        <section className="card-soft overflow-hidden">
          <header className="flex items-center px-6 h-14 border-b border-line-soft">
            <h2 className="text-[15px] font-semibold text-ink">Cost by tool</h2>
          </header>
          <div className="p-5 space-y-3">
            {toolBreakdown.map((t) => (
              <ToolRow key={t.tool} row={t} totalCost={stats.costTotal} />
            ))}
          </div>
        </section>
      </div>

      <section className="card-soft overflow-hidden mt-4">
        <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
          <h2 className="text-[15px] font-semibold text-ink">Per-user usage</h2>
          <span className="text-[12px] text-ink-faint">{userBreakdown.length} user{userBreakdown.length === 1 ? "" : "s"}</span>
        </header>
        <PerUserTable rows={userBreakdown} />
      </section>

      <section className="card-soft overflow-hidden mt-4">
        <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
          <h2 className="text-[15px] font-semibold text-ink">Recent API calls</h2>
          <span className="text-[12px] text-ink-faint">{records.length} record{records.length === 1 ? "" : "s"}</span>
        </header>
        <RecentTable records={records.slice(0, 80)} />
      </section>
    </>
  );
}

// --- Components ----------------------------------------------------------

function StatTile({
  icon,
  tile,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tile: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="eyebrow text-[11px] tracking-[0.15em]">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${tile} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
          style={{ color: "#0B3D7A" }}
        >
          {value}
        </span>
      </div>
      <p className="text-[12px] text-ink-muted mt-2 truncate">{sub}</p>
    </div>
  );
}

function DailyBarChart({ bars }: { bars: DailyBar[] }) {
  // Inline SVG bar chart. Width is responsive (100%); the SVG renders at a
  // fixed viewBox and the bars scale to fit. Each bar shows the day's cost
  // proportional to the window's max.
  const max = Math.max(...bars.map((b) => b.cost), 0.0001);
  const W = 700;
  const H = 200;
  const padX = 16;
  const padTop = 20;
  const padBottom = 30;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const barW = innerW / bars.length - 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {bars.map((b, i) => {
        const h = (b.cost / max) * innerH;
        const x = padX + i * (innerW / bars.length) + 3;
        const y = padTop + innerH - h;
        return (
          <g key={b.day}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={4}
              fill={b.cost > 0 ? "#2563EB" : "#E5EAF5"}
            />
            <text
              x={x + barW / 2}
              y={H - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#6B7B98"
              className="tabular-nums"
            >
              {b.day.slice(5)}
            </text>
            {b.cost > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#0B3D7A"
                className="tabular-nums"
              >
                ${b.cost.toFixed(3)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RecentTable({ records }: { records: UsageRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-ink-faint border-b border-line-soft">
            <th className="px-6 py-3 font-medium">When</th>
            <th className="px-6 py-3 font-medium">Tool</th>
            <th className="px-6 py-3 font-medium">User</th>
            <th className="px-6 py-3 font-medium">Context</th>
            <th className="px-6 py-3 font-medium text-right">Tokens</th>
            <th className="px-6 py-3 font-medium text-right">Cost</th>
            <th className="px-6 py-3 font-medium text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const tool = r.tool ?? "generate";
            const ctx =
              tool === "generate"
                ? [r.appName, r.category, r.platforms?.join("+")].filter(Boolean).join(" · ")
                : tool === "clarify"
                ? `${r.appName ?? ""} · ${r.category ?? ""}`
                : r.context ?? "—";
            return (
              <tr key={r.id} className="border-b border-line-soft last:border-0 hover:bg-blue-50/30">
                <td className="px-6 py-3 text-ink-muted whitespace-nowrap">{formatRelative(r.createdAt)}</td>
                <td className="px-6 py-3"><ToolBadge tool={tool} /></td>
                <td className="px-6 py-3 text-ink truncate max-w-[200px]" title={r.userEmail}>
                  {r.userEmail ?? r.userId.slice(0, 10)}
                </td>
                <td className="px-6 py-3 text-ink-muted truncate max-w-[280px]" title={ctx}>{ctx}</td>
                <td className="px-6 py-3 text-right tabular-nums text-ink">
                  {formatCompact(r.totalTokens)}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-ink">
                  ${r.estimatedCostUsd.toFixed(4)}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-ink-muted">
                  {(r.elapsedMs / 1000).toFixed(1)}s
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PerUserTable({ rows }: { rows: UserBreakdownRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-ink-faint border-b border-line-soft">
            <th className="px-6 py-3 font-medium">User</th>
            <th className="px-6 py-3 font-medium text-right">API calls</th>
            <th className="px-6 py-3 font-medium text-right">Generations</th>
            <th className="px-6 py-3 font-medium text-right">Clarify</th>
            <th className="px-6 py-3 font-medium text-right">Reddit</th>
            <th className="px-6 py-3 font-medium text-right">Tokens</th>
            <th className="px-6 py-3 font-medium text-right">Total cost</th>
            <th className="px-6 py-3 font-medium text-right">Avg / call</th>
            <th className="px-6 py-3 font-medium text-right">Last active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-line-soft last:border-0 hover:bg-blue-50/30">
              <td className="px-6 py-3 text-ink truncate max-w-[260px]" title={r.userEmail}>
                {r.userEmail ?? r.userId.slice(0, 10)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-ink">{r.totalCalls}</td>
              <td className="px-6 py-3 text-right tabular-nums text-ink-muted">{r.generateCalls}</td>
              <td className="px-6 py-3 text-right tabular-nums text-ink-muted">{r.clarifyCalls}</td>
              <td className="px-6 py-3 text-right tabular-nums text-ink-muted">{r.redditCalls}</td>
              <td className="px-6 py-3 text-right tabular-nums text-ink">{formatCompact(r.totalTokens)}</td>
              <td className="px-6 py-3 text-right tabular-nums font-semibold" style={{ color: "#0B3D7A" }}>
                ${r.totalCost.toFixed(4)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-ink-muted">
                ${r.avgCost.toFixed(4)}
              </td>
              <td className="px-6 py-3 text-right text-ink-muted whitespace-nowrap">{formatRelative(r.lastActiveAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ToolBadge({ tool }: { tool: UsageTool }) {
  const meta: Record<UsageTool, { label: string; tile: string; Icon: typeof Wand2 }> = {
    generate: { label: "Generate", tile: "tile-blue", Icon: Wand2 },
    clarify: { label: "Clarify", tile: "tile-lilac", Icon: HelpCircle },
    reddit: { label: "Reddit", tile: "tile-peach", Icon: MessageSquare },
    "keyword-insight": { label: "Keywords", tile: "tile-cream", Icon: Tag },
    "competitor-insight": { label: "Competitor", tile: "tile-rose", Icon: Target },
    "review-intelligence": { label: "Reviews", tile: "tile-mint", Icon: ChartBar },
  };
  const m = meta[tool] ?? meta.generate;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${m.tile} text-[11px] font-medium`}>
      <Icon size={11} strokeWidth={2} />
      {m.label}
    </span>
  );
}

function ToolRow({ row, totalCost }: { row: ToolBreakdownRow; totalCost: number }) {
  const share = totalCost > 0 ? (row.cost / totalCost) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <ToolBadge tool={row.tool} />
        <span className="text-[12px] tabular-nums text-ink-muted">{row.calls} call{row.calls === 1 ? "" : "s"}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-line-soft overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, backgroundColor: "#2563EB" }} />
        </div>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#0B3D7A" }}>
          ${row.cost.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

// --- Helpers -------------------------------------------------------------

interface DailyBar {
  day: string;          // ISO date (YYYY-MM-DD)
  cost: number;
  tokens: number;
  count: number;
}

interface ToolBreakdownRow {
  tool: UsageTool;
  calls: number;
  cost: number;
  tokens: number;
}

interface UserBreakdownRow {
  userId: string;
  userEmail?: string;
  totalCalls: number;
  generateCalls: number;
  clarifyCalls: number;
  redditCalls: number;
  totalTokens: number;
  totalCost: number;
  avgCost: number;
  lastActiveAt: string;
}

function buildToolBreakdown(records: UsageRecord[]): ToolBreakdownRow[] {
  const tools: UsageTool[] = ["generate", "clarify", "reddit"];
  return tools.map((tool) => {
    const rows = records.filter((r) => (r.tool ?? "generate") === tool);
    return {
      tool,
      calls: rows.length,
      cost: sum(rows, (r) => r.estimatedCostUsd),
      tokens: sum(rows, (r) => r.totalTokens),
    };
  });
}

function buildUserBreakdown(records: UsageRecord[]): UserBreakdownRow[] {
  const byUser = new Map<string, UserBreakdownRow>();
  for (const r of records) {
    const existing = byUser.get(r.userId) ?? {
      userId: r.userId,
      userEmail: r.userEmail,
      totalCalls: 0,
      generateCalls: 0,
      clarifyCalls: 0,
      redditCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      avgCost: 0,
      lastActiveAt: r.createdAt,
    };
    existing.totalCalls += 1;
    const tool = r.tool ?? "generate";
    if (tool === "generate") existing.generateCalls += 1;
    else if (tool === "clarify") existing.clarifyCalls += 1;
    else if (tool === "reddit") existing.redditCalls += 1;
    existing.totalTokens += r.totalTokens;
    existing.totalCost += r.estimatedCostUsd;
    if (Date.parse(r.createdAt) > Date.parse(existing.lastActiveAt)) {
      existing.lastActiveAt = r.createdAt;
    }
    if (r.userEmail && !existing.userEmail) existing.userEmail = r.userEmail;
    byUser.set(r.userId, existing);
  }
  const rows = Array.from(byUser.values()).map((r) => ({
    ...r,
    avgCost: r.totalCalls > 0 ? r.totalCost / r.totalCalls : 0,
  }));
  // Sort by total cost desc — biggest spenders surface first.
  rows.sort((a, b) => b.totalCost - a.totalCost);
  return rows;
}

function filterSince(records: UsageRecord[], days: number): UsageRecord[] {
  const cutoff = Date.now() - days * 86_400_000;
  return records.filter((r) => Date.parse(r.createdAt) >= cutoff);
}

function sum<T>(items: T[], picker: (t: T) => number): number {
  return items.reduce((s, t) => s + picker(t), 0);
}

function buildDailyBars(records: UsageRecord[], days: number): DailyBar[] {
  const map = new Map<string, DailyBar>();
  // Seed the last N days so empty days render as zero bars.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { day: key, cost: 0, tokens: 0, count: 0 });
  }
  for (const r of records) {
    const key = r.createdAt.slice(0, 10);
    const bar = map.get(key);
    if (!bar) continue;
    bar.cost += r.estimatedCostUsd;
    bar.tokens += r.totalTokens;
    bar.count += 1;
  }
  return Array.from(map.values());
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const delta = (Date.now() - t) / 1000;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 86400 * 7) return `${Math.floor(delta / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
}
