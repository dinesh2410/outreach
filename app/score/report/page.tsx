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

// Each check's weight + rationale comes from the top-app pattern analysis
// (see CHANGES.md). The numbers here mirror lib/score.ts so the audit display
// and the underlying score stay aligned.
const CHECK_META: Record<string, CheckMeta> = {
  "Title length within range": {
    weight: 3,
    rationale:
      "Top apps median title length is 16 chars; only 1/20 uses the 30-char cap. Comma-stuffed titles look amateur and convert worse.",
    fix: "Aim for 12–26 chars. Use 'Brand: Descriptor' if the brand isn't yet recognisable; just the brand if it is.",
    fixedNote: "Title length sits in the band top apps use — clean and uncrowded.",
  },
  "Title format is clean": {
    weight: 3,
    rationale:
      "When top apps add a descriptor, they use ' - ' or ': ' after the brand. Zero top apps comma-chain keywords like 'App, Tracker, Planner'.",
    fix: "Replace commas with a single colon or dash. Pick the strongest descriptor and drop the rest.",
    fixedNote: "Title format follows the brand + separator + descriptor pattern.",
  },
  "Short description uses available space": {
    weight: 4,
    rationale:
      "11/19 top apps use ≥70 of the 80 short-desc chars. Under-using this slot wastes prime real estate above the fold.",
    fix: "Expand to 60–80 chars. Lead with what the app does for the user; end as a complete clause.",
    fixedNote: "Short description uses the available space without overflowing the 80-char cap.",
  },
  "Short description leads with action": {
    weight: 3,
    rationale:
      "10/19 top apps open the short description with a verb (Make, Stay, Create, Listen…). Verb-led copy reads as confident and direct.",
    fix: "Rewrite to start with a strong verb or imperative. Avoid leading with the app name — the user already sees it.",
    fixedNote: "Short description opens with a verb — top-app pattern.",
  },
  "Full description hits target length": {
    weight: 4,
    rationale:
      "Top-app median is 2539 chars; the band is 1800–3600. Below 1800 reads as under-developed; near 4000 reads as bloated.",
    fix: "Aim for ~2500 chars. Add a section if you're short; consolidate if you're long.",
    fixedNote: "Full description hits the 1800–3600 band where top apps cluster.",
  },
  "Hook paragraph length": {
    weight: 4,
    rationale:
      "The hook is the only thing most users read. Top apps land it in 150–400 chars — one positioning sentence + one capability sentence.",
    fix: "Trim or expand the first paragraph to ~250 chars. Sentence 1: brand + outcome. Sentence 2: capability/proof.",
    fixedNote: "Hook fits the 150–400 char band — punchy enough to read above the fold.",
  },
  "Hook anchors the brand name": {
    weight: 4,
    rationale:
      "14/20 top apps put the brand in the first sentence. Heavy brand anchoring builds recognition signal across the listing.",
    fix: "Open with '[Brand] is/lets/helps [outcome]' or 'Use [Brand] to…'. The brand should appear in the first 10 words.",
    fixedNote: "Hook anchors the brand — readers know exactly what they're looking at.",
  },
  "Hook uses a proven opener pattern": {
    weight: 3,
    rationale:
      "17/20 top apps use one of three openers: '[Brand] is/lets/helps…', imperative verb, or scenario ('Whether you're…'). Pain-question openers ('Tired of…?') appear in zero top apps.",
    fix: "Switch to one of: '[Brand] is/lets/helps [outcome]', 'Use/Get/Explore [Brand] to…', or 'Whether you're [scenario]…'. Drop any question opener.",
    fixedNote: "Hook uses one of the three opener patterns top apps converge on.",
  },
  "Uses a consistent bullet character": {
    weight: 5,
    rationale:
      "14/20 top apps use • (U+2022); 2/20 use dashes (Instagram, Netflix). Both are valid. What's wrong is mixing chars or using ▶/◉/→ — those don't appear in any top app.",
    fix: "Pick one bullet character (• preferred, - and * also valid) and use it consistently. Avoid ▶, ◉, →, or other ASCII-arrow shapes.",
    fixedNote: "Bullet character is consistent — matches the discipline of top apps.",
  },
  "Body is split into scannable sections": {
    weight: 5,
    rationale:
      "17/20 top apps chunk the body — either via Title-Case labels + bullet lists OR by ending the hook with ':' and following with a long bullet list (the Google productivity-suite pattern).",
    fix: "Either add Title-Case labels above each bullet group (e.g. 'Sync everywhere', 'Built for privacy'), or end your hook with ':' so the bullets read as one labelled section.",
    fixedNote: "Body is chunked into scannable sections — the eye finds the structure.",
  },
  "Paragraphs stay short": {
    weight: 4,
    rationale:
      "15/20 top apps keep paragraphs ≤2 sentences. Long paragraphs drop completion rates on the listing.",
    fix: "Split any paragraph longer than 4 sentences into bullets or two shorter paragraphs.",
    fixedNote: "Paragraphs stay short — the body scans cleanly.",
  },
  "Section count is balanced": {
    weight: 2,
    rationale:
      "Top apps median is 10 paragraph blocks; the band is 5–14. Too few = under-structured; too many = fragmented.",
    fix: "Consolidate or split until you have 6–12 sections. Each one should cover a single capability area.",
    fixedNote: "Section count sits in the balanced range.",
  },
  "Hits core benefit keywords": {
    weight: 3,
    rationale:
      "Top apps hit 4–5 of: privacy/secure, free, easy/simple, share, anywhere/offline, help. These map to the dominant user-search vocabulary.",
    fix: "Work at least 3 of these benefit terms into the body naturally — typically one per feature section.",
    fixedNote: "Core benefit vocabulary is well-covered across the body.",
  },
  "Closing avoids store-CTA clichés": {
    weight: 2,
    rationale:
      "Only 1/20 top apps close with 'Download now' energy. The cliché caps how mature the listing reads.",
    fix: "Replace any store-CTA line with a soft sign-off ('Start your free trial today') or move it to a links/legal footer.",
    fixedNote: "Closing avoids 'Download now' clichés — reads mature, not aggressive.",
  },
  "Emoji usage is restrained": {
    weight: 2,
    rationale:
      "Only 2/20 top apps use emoji. Emoji-heavy bodies read as amateur copy on a professional platform.",
    fix: "Cap emoji at 2–3 across the whole description, and only where they earn their place (rating snippets, section dividers).",
    fixedNote: "Emoji usage is restrained — matches the discipline of top apps.",
  },
  "Exclamation marks stay restrained": {
    weight: 2,
    rationale:
      "Top apps run 0–2 exclamation marks in a 2500-char description. Heavy '!' use reads as hype.",
    fix: "Replace exclamation marks with periods. Reserve them for the one moment in the body that genuinely calls for it.",
    fixedNote: "Exclamation discipline is tight — body doesn't read as hype.",
  },
  "Brand name repeats across body": {
    weight: 2,
    rationale:
      "Top apps repeat the brand 3–8 times across the body. Heavy anchoring builds recognition and reinforces the search term.",
    fix: "Sprinkle the brand into section labels and bullet lead-ins. Avoid repeating it inside every sentence (that reads as stuffing).",
    fixedNote: "Brand is well-anchored across the body without overstuffing.",
  },
  "Listing preview only": {
    weight: 1,
    rationale:
      "We haven't fetched the live listing yet. This row reflects the placeholder score on the marketing teaser; the detailed report runs real checks.",
    fix: "Open the detailed report (or refresh) to fetch the live listing and run the full audit.",
    fixedNote: "Live listing available.",
  },
  // Ranking-signal checks (added 2026-05-13).
  "Primary keyword appears in title": {
    weight: 5,
    rationale:
      "Title is the heaviest-indexed field on Play and the strongest factor in iOS search ranking. Industry research (Phiture, AppTweak) consistently rates it as the single highest-leverage edit.",
    fix: "Add the primary keyword as a short descriptor after the brand (e.g. 'Brand: Keyword Tool'). Keep the title under 30 chars and avoid keyword-stuffing.",
    fixedNote: "Primary keyword is in the title — the highest-impact ranking position.",
  },
  "Primary keyword appears in short description": {
    weight: 4,
    rationale:
      "Google Play indexes the 80-char short description for ranking. Missing the primary keyword here forfeits ranking signal Apple/Play both reward.",
    fix: "Work the primary keyword naturally into the short description — ideally near the start. Don't stuff; one occurrence is enough.",
    fixedNote: "Primary keyword sits in the short description — Play indexes this field.",
  },
  "Average rating": {
    weight: 5,
    rationale:
      "Rating is the single biggest ranking signal we can measure from outside Play Console / App Store Connect. Apple requires 4.0+ for many shelf placements; Play weights it heavily in category rankings and search.",
    fix: "If under 4.0, pause copy work and focus on the 1-star themes. Add an in-app rating prompt after a positive moment (not on launch) — fresh ratings count more than old ones.",
    fixedNote: "Average rating clears the 4.0 ranking floor.",
  },
  "Rating volume": {
    weight: 3,
    rationale:
      "Rating count signals credibility to users and feeds ranking. Under ~100 reads as 'too new to evaluate'; 1K+ starts to feel established.",
    fix: "Add a rating prompt to your onboarding completion / first-success flow. Avoid prompting too early — it tanks the rating.",
    fixedNote: "Rating volume is past the credibility threshold.",
  },
  "Listing freshness": {
    weight: 3,
    rationale:
      "Both stores down-rank listings that haven't shipped in 6+ months and prefer recently-updated apps in search results. Freshness is a maintenance signal both stores explicitly weight.",
    fix: "Ship a small version bump every 6–8 weeks with a refreshed What's New note. Even a copy refresh resets the freshness signal.",
    fixedNote: "Listing was updated recently — freshness signal is good.",
  },
  "Screenshot coverage": {
    weight: 4,
    rationale:
      "Screenshots drive conversion rate, which feeds install velocity (a ranking signal). Top-3 screenshots are critical — they're the only ones visible in most search results.",
    fix: "Upload at least 5 screenshots. Lead with the most install-worthy frames; treat the first 3 as the 'hero trio' and A/B test them.",
    fixedNote: "Screenshot coverage matches the slots top apps fill.",
  },
};

const FALLBACK_META: CheckMeta = {
  weight: 2,
  rationale: "Contributes to the overall ASO score against patterns from top-app listings.",
  fix: "Review this check against the recommended action and update your listing.",
  fixedNote: "This check is passing — keep it on your review checklist.",
};

function getMeta(label: string): CheckMeta {
  return CHECK_META[label] ?? FALLBACK_META;
}

function priorityForCheck(check: ScoreCheck): "high" | "medium" | "low" {
  const w = getMeta(check.label).weight;
  if (w >= 4) return "high";
  if (w >= 3) return "medium";
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

  // The score is computed from the scraped listing once /api/audit returns it.
  // Before the audit lands (or if the scrape failed), we fall back to the
  // URL-only preview so the page can render something.
  const result: ScoreResult | null = useMemo(() => {
    if (!rawUrl) return null;
    return calculateScore(rawUrl, audit?.scrape ?? null);
  }, [rawUrl, audit]);

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

      {/* Strategic advice — non-scored ASO guidance the scrape can't measure */}
      {audit?.advisories && audit.advisories.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            tile="tile-lilac"
            icon={<Sparkles size={16} strokeWidth={1.85} />}
            eyebrow="What we can't see from outside"
            title="Beyond the listing copy"
          />
          <p className="text-[14px] text-ink-muted leading-relaxed mb-6 max-w-2xl">
            These are the biggest ASO levers we can&apos;t measure from a public scrape — the signals you track in Play Console and App Store Connect. They typically move ranking more than copy tweaks.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audit.advisories.map((a) => {
              const categoryStyle: Record<string, { bg: string; color: string; label: string }> = {
                ranking:    { bg: "#FFF6E0", color: "#8A5A00", label: "Ranking" },
                conversion: { bg: "#D8F2E3", color: "#0F6F44", label: "Conversion" },
                maintenance:{ bg: "#E7E0FA", color: "#4B2C99", label: "Maintenance" },
                expansion:  { bg: "#FCE3EA", color: "#9E0048", label: "Expansion" },
              };
              const cs = categoryStyle[a.category] ?? categoryStyle.ranking;
              return (
                <div key={a.label} className="card-soft p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cs.bg, color: cs.color }}
                    >
                      {cs.label}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-ink mb-2 tracking-[-0.01em]">{a.label}</h3>
                  <p className="text-[13px] text-ink-muted leading-relaxed">{a.detail}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
