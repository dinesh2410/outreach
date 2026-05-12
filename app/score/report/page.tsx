"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { calculateScore } from "@/lib/score";
import type { AuditPayload, ScoreCheck, ScoreResult } from "@/lib/types";

// Deterministic id from URL so re-running the same audit replaces the prior
// record instead of duplicating in history.
function auditIdFor(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return `aud_${(h >>> 0).toString(36)}`;
}
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Copy,
  Download,
  Wand2,
  ListChecks,
  Lightbulb,
  Sparkles,
  Hash,
  Smartphone,
  Apple,
  Globe,
  Tag,
  Loader2,
  RefreshCw,
  Archive,
} from "lucide-react";

// AuditPayload comes from lib/types so the audit record snapshot type and
// the in-page audit type stay in sync.

// ---- Per-check meta (weight, rationale, recommended fix) -------------------

type CheckMeta = {
  weight: number;
  rationale: string;
  fix: string;
  fixedNote: string;
};

const CHECK_META: Record<string, CheckMeta> = {
  "Title uses primary keyword": {
    weight: 20,
    rationale:
      "Stores index the title most heavily. A title without your primary keyword caps discoverability before anything else can help.",
    fix: "Place your primary keyword in the first 30 characters of the title. Lead with the category or use-case the user is searching for.",
    fixedNote:
      "Your title carries the primary keyword in a high-weight position — keep this through any rewrites.",
  },
  "Short description under 80 chars": {
    weight: 15,
    rationale:
      "On Play, the 80-char short description is the second thing a user sees after the title — and it gets indexed.",
    fix: "Trim to 80 characters max. Lead with the single biggest benefit, not features. One claim, one verb, no filler.",
    fixedNote:
      "Short description fits inside the 80-char limit and won't get truncated on the Play listing.",
  },
  "Full description is keyword-balanced": {
    weight: 18,
    rationale:
      "Repeating keywords in only the first paragraph hurts ranking signal across the listing. The whole description should reinforce them.",
    fix: "Spread your 3–5 priority keywords evenly across opening, features, and closing paragraphs. Don't stuff — repeat naturally.",
    fixedNote:
      "Keywords are distributed across the body. Re-check whenever you change the description.",
  },
  "Description leads with a hook": {
    weight: 17,
    rationale:
      "The first sentence is shown above the fold on every device. Generic openings (\"Welcome to…\") cost you the read.",
    fix: "Open with a benefit-led sentence. Tell the reader what's different about your app in one line, then expand.",
    fixedNote:
      "Your opening sentence pulls weight — keep it punchy and specific in future edits.",
  },
  "Uses bullet points for features": {
    weight: 15,
    rationale:
      "Bullets scan in 2 seconds; paragraphs don't. Stores reward scannable feature sections with longer reads and more conversions.",
    fix: "Convert your features paragraph into 4–6 bullet points. One feature per line, verb-first, under 12 words each.",
    fixedNote:
      "Feature section is scannable. Keep bullets short and consistent when adding new features.",
  },
  "Mentions target audience": {
    weight: 15,
    rationale:
      "Audience-specific copy converts higher than generic copy. \"For runners training under 6:00/km\" beats \"for anyone who exercises\".",
    fix: "Add one explicit audience line near the top: who this app is built for, and what they're trying to do.",
    fixedNote:
      "Audience is clearly named in the listing — the right people self-identify when scrolling.",
  },
};

const FALLBACK_META: CheckMeta = {
  weight: 10,
  rationale: "Contributes to the overall ASO score against the store's ranking signals.",
  fix: "Review this check against the recommended action and update your listing.",
  fixedNote: "This check is passing — keep it on your review checklist.",
};

function getMeta(label: string): CheckMeta {
  return CHECK_META[label] ?? FALLBACK_META;
}

function priorityForCheck(check: ScoreCheck): "high" | "medium" | "low" {
  const w = getMeta(check.label).weight;
  if (w >= 18) return "high";
  if (w >= 15) return "medium";
  return "low";
}

// ---- Page -----------------------------------------------------------------

export default function ScoreReportPage() {
  return (
    <Suspense fallback={null}>
      <ScoreReportInner />
    </Suspense>
  );
}

function ScoreReportInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, loading, audits, recordAudit } = useAuth();
  const { push } = useToast();
  const rawUrl = search.get("url") ?? "";
  const [exporting, setExporting] = useState(false);

  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  // Timestamp the data was originally captured, when we're showing a saved
  // snapshot instead of a fresh live fetch. null when looking at live data.
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      const target = `/score/report?url=${encodeURIComponent(rawUrl)}`;
      router.replace(`/auth?next=${encodeURIComponent(target)}`);
    }
  }, [user, loading, rawUrl, router]);

  // Fire a live audit fetch + persist with full snapshot. Pulled out so the
  // Refresh button can re-trigger it without going through useEffect dance.
  const runAudit = useCallback(
    async (url: string) => {
      setAuditLoading(true);
      setAuditError(null);
      setSnapshotAt(null);
      try {
        const r = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as AuditPayload;
        setAudit(data);
        // Persist the full payload so re-opening from history shows the same
        // data without a re-scrape (useful for month-over-month comparison).
        recordAudit({
          id: auditIdFor(url),
          url,
          source: data.source,
          appName: data.scrape.title,
          score: data.score.score,
          grade: data.score.grade,
          createdAt: new Date().toISOString(),
          snapshot: data,
        });
      } catch (err) {
        setAuditError(err instanceof Error ? err.message : "Audit failed");
      } finally {
        setAuditLoading(false);
      }
    },
    [recordAudit]
  );

  // First-load resolver: when audits are hydrated, prefer the saved snapshot
  // for this URL over re-fetching. Only one of (snapshot load, live fetch)
  // fires per (user, rawUrl).
  const resolvedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !rawUrl) return;
    if (resolvedRef.current === rawUrl) return;
    const id = auditIdFor(rawUrl);
    const saved = audits.find((a) => a.id === id);
    if (saved?.snapshot) {
      resolvedRef.current = rawUrl;
      // Restore the exact saved view; URL-driven sync from external state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudit(saved.snapshot);
      setSnapshotAt(saved.createdAt);
      setAuditLoading(false);
      return;
    }
    // No snapshot yet — only fire the live fetch once audits have finished
    // hydrating, otherwise we'd unnecessarily re-scrape on every replay.
    if (loading) return;
    resolvedRef.current = rawUrl;
    runAudit(rawUrl);
  }, [rawUrl, user, audits, loading, runAudit]);

  async function handleRefresh() {
    if (auditLoading) return;
    await runAudit(rawUrl);
  }

  // The deterministic score result is the source of truth for the check list.
  // When viewing a snapshot, use the score embedded in the snapshot so the
  // grade matches what was saved (the deterministic score has no concept of
  // history — it's a pure function of the URL).
  const result: ScoreResult | null = useMemo(() => {
    if (!rawUrl) return null;
    return calculateScore(rawUrl);
  }, [rawUrl]);

  if (loading || !user) return null;

  if (!result) {
    return (
      <AppShell
        eyebrow="Score Checker · Detailed report"
        title="No listing to audit"
        description="Run the Score Checker first to generate a detailed report."
      >
        <div className="card-soft p-10 max-w-xl">
          <p className="text-[15px] text-ink-muted mb-6">
            We didn&apos;t get a URL to audit. Head back to the Score Checker and paste your App Store or Play Store URL.
          </p>
          <Link
            href="/score"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Score Checker
          </Link>
        </div>
      </AppShell>
    );
  }

  const passed = result.checks.filter((c) => c.passed);
  const failed = result.checks.filter((c) => !c.passed);
  const totalWeight = result.checks.reduce(
    (sum, c) => sum + getMeta(c.label).weight,
    0
  );

  const priorityFixes = [...failed].sort(
    (a, b) => getMeta(b.label).weight - getMeta(a.label).weight
  );

  const gradeColor =
    result.grade === "A" ? "#10B981" :
    result.grade === "B" ? "#2563EB" :
    result.grade === "C" ? "#0B3D7A" :
    result.grade === "D" ? "#B0274F" : "#9E4A0F";

  async function copyAsMarkdown() {
    if (!result) return;
    const lines = [
      `# ASO Audit Report`,
      ``,
      `**URL:** ${rawUrl}`,
      `**Score:** ${result.score}/100  ·  **Grade:** ${result.grade}`,
      `**Generated:** ${new Date().toLocaleString()}`,
      ``,
    ];

    if (audit?.scrape.ok) {
      lines.push(`## Listing snapshot`, ``);
      if (audit.scrape.title) lines.push(`- **Title:** ${audit.scrape.title}`);
      if (audit.scrape.subtitle) lines.push(`- **Subtitle:** ${audit.scrape.subtitle}`);
      if (audit.scrape.shortDesc) lines.push(`- **Short description:** ${audit.scrape.shortDesc}`);
      if (audit.snapshot.appId) lines.push(`- **App ID:** ${audit.snapshot.appId}`);
      if (audit.snapshot.country) lines.push(`- **Country:** ${audit.snapshot.country.toUpperCase()}`);
      lines.push(``);
    }

    if (audit?.keywords.primary) {
      lines.push(`## Keywords`, ``);
      lines.push(`- **Primary:** ${audit.keywords.primary.word} (${audit.keywords.primary.count}×)`);
      audit.keywords.secondary.forEach((k) => {
        lines.push(`- ${k.word} (${k.count}×)`);
      });
      lines.push(``);
    }

    lines.push(`## Checks`, ``);
    result.checks.forEach((c) => {
      const m = getMeta(c.label);
      lines.push(`### ${c.passed ? "✅" : "⚠️"} ${c.label}  (${m.weight}pt)`);
      lines.push(``);
      lines.push(c.passed ? m.fixedNote : c.note);
      lines.push(``);
      if (!c.passed) {
        lines.push(`**Fix:** ${m.fix}`);
        lines.push(``);
      }
      lines.push(`**Why it matters:** ${m.rationale}`);
      lines.push(``);
    });

    try {
      setExporting(true);
      await navigator.clipboard.writeText(lines.join("\n"));
      push("Report copied as Markdown", "success");
    } finally {
      setTimeout(() => setExporting(false), 400);
    }
  }

  function downloadJson() {
    if (!result) return;
    const payload = {
      url: rawUrl,
      score: result.score,
      grade: result.grade,
      generatedAt: new Date().toISOString(),
      snapshot: audit?.snapshot,
      keywords: audit?.keywords,
      characterUsage: audit?.characterUsage,
      scrape: audit?.scrape,
      checks: result.checks.map((c) => ({
        label: c.label,
        passed: c.passed,
        note: c.note,
        ...getMeta(c.label),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outreach-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push("Report downloaded", "success");
  }

  return (
    <AppShell
      eyebrow="Score Checker · Detailed report"
      title={`Grade ${result.grade} · ${result.score}/100`}
      description={
        snapshotAt
          ? `Saved snapshot · captured ${relativeTime(snapshotAt)}.`
          : "Listing snapshot, keyword profile, per-check breakdown — and the exact fix to ship next."
      }
      actions={
        <div className="flex items-center gap-2">
          {snapshotAt && (
            <button
              onClick={handleRefresh}
              disabled={auditLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {auditLoading ? (
                <Loader2 size={13} className="animate-spin-slow" />
              ) : (
                <RefreshCw size={13} strokeWidth={2} />
              )}
              {auditLoading ? "Refreshing…" : "Refresh data"}
            </button>
          )}
          <Link
            href="/score"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            <ArrowLeft size={14} />
            Run another audit
          </Link>
        </div>
      }
    >
      {snapshotAt && (
        <SnapshotBanner
          savedAt={snapshotAt}
          onRefresh={handleRefresh}
          running={auditLoading}
        />
      )}

      {/* Audited URL strip */}
      <UrlStrip rawUrl={rawUrl} audit={audit} loading={auditLoading} />

      {/* Top stat row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 mb-10">
        <div
          className="card-soft p-7 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #EFF4FE 100%)" }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">Overall</p>
              <p className="text-[15px] font-semibold text-ink">Listing health</p>
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: gradeColor }}
            >
              Grade {result.grade}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[80px] font-bold leading-none tabular-nums"
              style={{ color: "#0B3D7A" }}
            >
              {result.score}
            </span>
            <span className="text-[16px] text-ink-muted">/ 100</span>
          </div>
          <div className="h-2 rounded-full bg-cream-deep overflow-hidden mt-6">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${result.score}%`, backgroundColor: "#2563EB" }}
            />
          </div>
        </div>

        <StatCard tile="tile-mint" icon={<CheckCircle2 size={16} strokeWidth={1.85} />} label="Passing" value={passed.length} sub={`of ${result.checks.length} checks`} />
        <StatCard tile="tile-cream" icon={<AlertCircle size={16} strokeWidth={1.85} />} label="Needs work" value={failed.length} sub="checks to fix" />
        <StatCard tile="tile-lilac" icon={<ListChecks size={16} strokeWidth={1.85} />} label="Total weight" value={totalWeight} sub="points across all checks" />
      </div>

      {/* Listing snapshot — real data from the scraper */}
      {(auditLoading || audit) && (
        <ListingSnapshot audit={audit} loading={auditLoading} error={auditError} />
      )}

      {/* Keyword profile */}
      {audit && audit.keywords.primary && (
        <KeywordProfile keywords={audit.keywords} />
      )}

      {/* Character usage */}
      {audit && audit.characterUsage.length > 0 && (
        <CharacterUsage usage={audit.characterUsage} source={audit.source} />
      )}

      {/* Priority fixes */}
      {priorityFixes.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            tile="tile-cream"
            icon={<Lightbulb size={16} strokeWidth={1.85} />}
            eyebrow="Priority"
            title="Fix these first"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priorityFixes.slice(0, 4).map((c, i) => {
              const m = getMeta(c.label);
              return (
                <div key={c.label} className="card-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#FFF6E0", color: "#8A5A00" }}
                    >
                      #{i + 1} Priority · {m.weight}pt
                    </span>
                    <PriorityBadge level={priorityForCheck(c)} />
                  </div>
                  <h3 className="text-[16px] font-semibold text-ink mb-2 tracking-[-0.01em]">{c.label}</h3>
                  <p className="text-[13px] text-ink-muted leading-relaxed mb-4">{c.note}</p>
                  <div className="rounded-xl bg-cream-deep p-4">
                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: "#0B3D7A" }}>
                      Recommended fix
                    </p>
                    <p className="text-[13px] text-ink leading-relaxed">{m.fix}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full breakdown */}
      <section className="mb-10">
        <SectionHeader
          tile="tile-blue"
          icon={<ListChecks size={16} strokeWidth={1.85} />}
          eyebrow="Full breakdown"
          title="Every check, scored"
        />
        <div className="space-y-4">
          {result.checks.map((c) => {
            const m = getMeta(c.label);
            return (
              <div key={c.label} className="card-soft p-6">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        c.passed ? "tile-mint" : "tile-cream"
                      }`}
                    >
                      {c.passed ? (
                        <CheckCircle2 size={18} strokeWidth={2.25} />
                      ) : (
                        <AlertCircle size={18} strokeWidth={2.25} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-ink tracking-[-0.01em]">{c.label}</h3>
                      <p className="text-[12px] text-ink-faint mt-0.5">
                        Weight {m.weight}pt · {c.passed ? "Passing" : "Needs work"}
                      </p>
                    </div>
                  </div>
                  <PriorityBadge level={priorityForCheck(c)} />
                </div>

                <p className="text-[14px] text-ink leading-relaxed mb-4 max-w-3xl">
                  {c.passed ? m.fixedNote : c.note}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-cream-deep p-4">
                    <p className="text-[11px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: "#0B3D7A" }}>
                      Why it matters
                    </p>
                    <p className="text-[13px] text-ink-muted leading-relaxed">{m.rationale}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: c.passed ? "#D8F2E3" : "#FFF6E0" }}>
                    <p
                      className="text-[11px] uppercase tracking-[0.15em] font-bold mb-2"
                      style={{ color: c.passed ? "#0F6F44" : "#8A5A00" }}
                    >
                      {c.passed ? "Keep it healthy" : "Recommended fix"}
                    </p>
                    <p className="text-[13px] text-ink leading-relaxed">
                      {c.passed ? m.fixedNote : m.fix}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Next step + export */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        <div className="card-soft p-7">
          <p className="eyebrow mb-3">Next step</p>
          <h2 className="text-[24px] font-semibold tracking-[-0.01em] mb-3" style={{ color: "#0B3D7A" }}>
            Turn this audit into copy
          </h2>
          <p className="text-[14px] text-ink-muted leading-relaxed mb-6 max-w-lg">
            Hand these fixes to the ASO Generator. It bakes the priority recommendations
            into your next set of variants automatically.
          </p>
          <Link
            href="/generator"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
          >
            <Wand2 size={15} strokeWidth={2} />
            Open ASO Generator
          </Link>
        </div>

        <div className="card-soft p-7">
          <p className="eyebrow mb-3">Export</p>
          <h3 className="text-[18px] font-semibold text-ink mb-4 tracking-[-0.01em]">Save the report</h3>
          <div className="space-y-2">
            <button
              onClick={copyAsMarkdown}
              disabled={exporting}
              className="w-full px-4 py-3 rounded-xl bg-cream-deep text-[13px] font-medium text-ink hover:bg-line transition-colors inline-flex items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <Copy size={14} strokeWidth={2} />
                Copy as Markdown
              </span>
              <span className="text-[11px] text-ink-faint">.md</span>
            </button>
            <button
              onClick={downloadJson}
              className="w-full px-4 py-3 rounded-xl bg-cream-deep text-[13px] font-medium text-ink hover:bg-line transition-colors inline-flex items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <Download size={14} strokeWidth={2} />
                Download as JSON
              </span>
              <span className="text-[11px] text-ink-faint">.json</span>
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

// ---- Subcomponents --------------------------------------------------------

function SnapshotBanner({
  savedAt,
  onRefresh,
  running,
}: {
  savedAt: string;
  onRefresh: () => void;
  running: boolean;
}) {
  return (
    <div
      className="card-soft p-5 mb-5 flex items-center gap-4 flex-wrap"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F2ECFE 100%)" }}
    >
      <div className="w-10 h-10 rounded-xl tile-lilac flex items-center justify-center shrink-0">
        <Archive size={16} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Saved snapshot</p>
        <p className="text-[13px] text-ink-muted mt-1">
          You&apos;re viewing data captured {relativeTime(savedAt)} ({new Date(savedAt).toLocaleString()}).
          Listings drift over time — use Refresh to re-scrape and compare.
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      >
        {running ? <Loader2 size={13} className="animate-spin-slow" /> : <RefreshCw size={13} strokeWidth={2} />}
        {running ? "Refreshing…" : "Refresh data"}
      </button>
    </div>
  );
}

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

function SectionHeader({ tile, icon, eyebrow, title }: { tile: string; icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function StatCard({
  tile,
  icon,
  label,
  value,
  sub,
}: {
  tile: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="card-soft p-6">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="text-[36px] font-semibold leading-none tracking-[-0.02em] mt-2 tabular-nums" style={{ color: "#0B3D7A" }}>
        {value}
      </p>
      <p className="text-[12px] text-ink-muted mt-2">{sub}</p>
    </div>
  );
}

function UrlStrip({ rawUrl, audit, loading }: { rawUrl: string; audit: AuditPayload | null; loading: boolean }) {
  const StoreIcon = audit?.source === "ios" ? Apple : audit?.source === "play" ? Smartphone : Globe;
  const sourceLabel =
    audit?.source === "ios" ? "App Store"
    : audit?.source === "play" ? "Google Play"
    : "Unknown store";

  return (
    <div className="card-soft p-5 mb-5 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
        <StoreIcon size={16} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ink-faint">{sourceLabel}</p>
          {loading && (
            <span className="inline-flex items-center gap-1 text-[10px] text-ink-faint">
              <Loader2 size={10} className="animate-spin-slow" />
              Fetching live listing…
            </span>
          )}
        </div>
        <p className="text-[13px] font-mono text-ink truncate">{rawUrl}</p>
      </div>
      <p className="text-[12px] text-ink-faint shrink-0">
        Generated {new Date().toLocaleString()}
      </p>
    </div>
  );
}

function ListingSnapshot({
  audit,
  loading,
  error,
}: {
  audit: AuditPayload | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="mb-10">
      <SectionHeader
        tile="tile-blue"
        icon={<Sparkles size={16} strokeWidth={1.85} />}
        eyebrow="Listing snapshot"
        title="What we found on the store"
      />

      {loading && !audit ? (
        <div className="card-soft p-8 flex items-center gap-3 text-ink-muted">
          <Loader2 size={16} className="animate-spin-slow" />
          <span className="text-[14px]">Reading the live listing…</span>
        </div>
      ) : error || !audit ? (
        <div className="card-soft p-6">
          <p className="text-[14px] text-ink-muted">
            We couldn&apos;t reach the live listing right now. The audit uses the URL fingerprint instead.
          </p>
        </div>
      ) : !audit.scrape.ok ? (
        <div className="card-soft p-6">
          <p className="text-[14px] text-ink-muted">
            The store didn&apos;t return a parseable listing for this URL. Double-check the URL points at a public app page.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <SnapshotField label="App ID" value={audit.snapshot.appId} />
            <SnapshotField label="Slug" value={audit.snapshot.slug} />
            <SnapshotField label="Country" value={audit.snapshot.country?.toUpperCase()} />
            <SnapshotField label="Locale" value={audit.snapshot.locale} />
          </div>
        </div>
      ) : (
        <div className="card-soft p-6 space-y-5">
          {audit.scrape.title && (
            <SnapshotBlock label="Title" value={audit.scrape.title} />
          )}
          {audit.scrape.subtitle && (
            <SnapshotBlock label="Subtitle" value={audit.scrape.subtitle} />
          )}
          {audit.scrape.shortDesc && (
            <SnapshotBlock label="Short description" value={audit.scrape.shortDesc} />
          )}
          {audit.scrape.fullDesc && (
            <SnapshotBlock
              label="Full description"
              value={audit.scrape.fullDesc.length > 280
                ? audit.scrape.fullDesc.slice(0, 280) + "…"
                : audit.scrape.fullDesc}
              hint={`${audit.scrape.fullDesc.length} chars total`}
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-line-soft">
            <SnapshotField label="App ID" value={audit.snapshot.appId} />
            <SnapshotField label="Slug" value={audit.snapshot.slug} />
            <SnapshotField label="Country" value={audit.snapshot.country?.toUpperCase()} />
            <SnapshotField label="Locale" value={audit.snapshot.locale} />
          </div>
        </div>
      )}
    </section>
  );
}

function SnapshotBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: "#0B3D7A" }}>
        {label}
        {hint && <span className="ml-2 text-ink-faint font-medium tracking-normal normal-case">· {hint}</span>}
      </p>
      <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function SnapshotField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint mb-1">{label}</p>
      <p className="text-[13px] font-mono text-ink truncate">{value || "—"}</p>
    </div>
  );
}

function KeywordProfile({ keywords }: { keywords: AuditPayload["keywords"] }) {
  const primary = keywords.primary!;
  const all = [primary, ...keywords.secondary];
  const maxCount = Math.max(...all.map((k) => k.count), 1);

  return (
    <section className="mb-10">
      <SectionHeader
        tile="tile-lilac"
        icon={<Hash size={16} strokeWidth={1.85} />}
        eyebrow="Keyword profile"
        title="What your listing is ranking for"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">
        {/* Primary keyword card */}
        <div
          className="card-soft p-7 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F2ECFE 100%)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Tag size={14} strokeWidth={2} style={{ color: "#5B3FB8" }} />
            <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "#5B3FB8" }}>
              Primary keyword
            </p>
          </div>
          <p className="text-[40px] font-semibold leading-tight tracking-[-0.02em] mb-3" style={{ color: "#0B3D7A" }}>
            {primary.word}
          </p>
          <p className="text-[13px] text-ink-muted leading-relaxed mb-4">
            Appears <strong className="text-ink font-semibold">{primary.count}×</strong> across the title, subtitle and description.
            This is the term the store will rank you for most strongly.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[12px] font-medium text-ink border border-line-soft">
            {keywords.totalUnique} unique keywords detected
          </div>
        </div>

        {/* Secondary keywords */}
        <div className="card-soft p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-5" style={{ color: "#5B3FB8" }}>
            Secondary keywords
          </p>
          {keywords.secondary.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No additional keywords stood out — broaden the description to add more category vocabulary.</p>
          ) : (
            <ul className="space-y-3">
              {keywords.secondary.map((k) => (
                <li key={k.word} className="flex items-center gap-4">
                  <span className="text-[14px] font-semibold text-ink min-w-[120px] truncate">{k.word}</span>
                  <div className="flex-1 h-2 rounded-full bg-cream-deep overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(k.count / maxCount) * 100}%`,
                        backgroundColor: "#5B3FB8",
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-mono text-ink-faint w-10 text-right tabular-nums">{k.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function CharacterUsage({
  usage,
  source,
}: {
  usage: AuditPayload["characterUsage"];
  source: AuditPayload["source"];
}) {
  return (
    <section className="mb-10">
      <SectionHeader
        tile="tile-mint"
        icon={<ListChecks size={16} strokeWidth={1.85} />}
        eyebrow="Character usage"
        title={`${source === "ios" ? "App Store" : "Play Store"} field limits`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {usage.map((u) => {
          const pct = Math.min(100, (u.actual / u.limit) * 100);
          const barColor =
            u.status === "over" ? "#B0274F"
            : u.status === "tight" ? "#FBBF24"
            : u.status === "missing" ? "#9CA3AF"
            : "#10B981";
          const statusLabel =
            u.status === "over" ? "Over limit"
            : u.status === "tight" ? "Near limit"
            : u.status === "missing" ? "Missing"
            : "Within limit";
          const statusTile =
            u.status === "over" ? "tile-rose"
            : u.status === "tight" ? "tile-cream"
            : u.status === "missing" ? "bg-cream-deep text-ink-muted"
            : "tile-mint";

          return (
            <div key={u.field} className="card-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-semibold text-ink">{u.field}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${statusTile}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-[24px] font-bold tabular-nums" style={{ color: "#0B3D7A" }}>
                  {u.actual}
                </span>
                <span className="text-[12px] text-ink-muted">/ {u.limit} chars</span>
              </div>
              <div className="h-2 rounded-full bg-cream-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PriorityBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cfg = {
    high:   { label: "High",   tile: "tile-rose",  color: "#B0274F" },
    medium: { label: "Medium", tile: "tile-cream", color: "#8A5A00" },
    low:    { label: "Low",    tile: "tile-mint",  color: "#0F6F44" },
  }[level];
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${cfg.tile}`}
      style={{ color: cfg.color }}
    >
      {cfg.label} priority
    </span>
  );
}
