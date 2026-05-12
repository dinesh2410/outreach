"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import type {
  CompetitorAnalysisResult,
  CompetitorAppData,
  CompetitorInsight,
} from "@/lib/types";
import {
  ArrowRight,
  Loader2,
  Plus,
  X,
  Target,
  TrendingUp,
  Star,
  Hash,
  Apple,
  Smartphone,
  Globe,
  ExternalLink,
  Wand2,
  Sparkles,
} from "lucide-react";

export default function CompetitorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { push } = useToast();

  const [appUrl, setAppUrl] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [analysis, setAnalysis] = useState<CompetitorAnalysisResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?next=%2Fcompetitor");
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (running || !appUrl.trim()) return;
    setRunning(true);
    setAnalysis(null);
    try {
      const competitors = competitorUrls.map((u) => u.trim()).filter(Boolean);
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appUrl.trim(), competitors }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CompetitorAnalysisResult;
      setAnalysis(data);
    } catch (err) {
      push(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  function addCompetitorField() {
    if (competitorUrls.length >= 5) return;
    setCompetitorUrls([...competitorUrls, ""]);
  }

  function updateCompetitor(idx: number, value: string) {
    setCompetitorUrls((arr) => arr.map((v, i) => (i === idx ? value : v)));
  }

  function removeCompetitor(idx: number) {
    setCompetitorUrls((arr) => (arr.length === 1 ? [""] : arr.filter((_, i) => i !== idx)));
  }

  function handleReset() {
    setAnalysis(null);
    setAppUrl("");
    setCompetitorUrls([""]);
  }

  return (
    <AppShell
      eyebrow="Tools · Competitor Watch"
      title={analysis ? "Competitor analysis" : "Who are you up against?"}
      description={
        analysis
          ? "Side-by-side comparison of your listing and your closest competitors."
          : "Paste your app URL — we'll find the top competitors automatically. Or paste specific competitor URLs to compare against a curated list."
      }
      actions={
        analysis ? (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            New analysis
          </button>
        ) : undefined
      }
    >
      {!analysis ? (
        <InputForm
          appUrl={appUrl}
          setAppUrl={setAppUrl}
          competitorUrls={competitorUrls}
          updateCompetitor={updateCompetitor}
          removeCompetitor={removeCompetitor}
          addCompetitorField={addCompetitorField}
          onSubmit={handleRun}
          running={running}
        />
      ) : (
        <Results analysis={analysis} />
      )}
    </AppShell>
  );
}

function InputForm({
  appUrl,
  setAppUrl,
  competitorUrls,
  updateCompetitor,
  removeCompetitor,
  addCompetitorField,
  onSubmit,
  running,
}: {
  appUrl: string;
  setAppUrl: (v: string) => void;
  competitorUrls: string[];
  updateCompetitor: (i: number, v: string) => void;
  removeCompetitor: (i: number) => void;
  addCompetitorField: () => void;
  onSubmit: (e: React.FormEvent) => void;
  running: boolean;
}) {
  const filledCompetitors = competitorUrls.filter((u) => u.trim()).length;

  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-soft p-7 space-y-7">
        <div>
          <label className="eyebrow mb-3 block">Your app</label>
          <input
            type="url"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            required
            placeholder="https://apps.apple.com/… or https://play.google.com/store/apps/details?id=…"
            className="w-full px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
          <p className="text-[12px] text-ink-faint mt-2">
            We&apos;ll fetch your listing, then find or compare competitors.
          </p>
        </div>

        <div>
          <label className="eyebrow mb-3 block">
            Competitor URLs <span className="text-ink-faint font-normal tracking-normal normal-case">· optional, up to 5</span>
          </label>
          <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
            Leave empty for auto-discovery (works best for App Store listings — we use iTunes
            Search by your primary keyword). Paste specific competitor URLs to compare against
            a curated list instead.
          </p>
          <div className="space-y-2">
            {competitorUrls.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="url"
                  value={value}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  placeholder={`Competitor ${i + 1} URL`}
                  className="flex-1 px-5 py-3 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
                />
                {(competitorUrls.length > 1 || value) && (
                  <button
                    type="button"
                    onClick={() => removeCompetitor(i)}
                    className="w-10 h-10 rounded-full text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors inline-flex items-center justify-center"
                    aria-label="Remove competitor"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {competitorUrls.length < 5 && (
            <button
              type="button"
              onClick={addCompetitorField}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <Plus size={14} strokeWidth={2.25} />
              Add another competitor
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-line-soft">
          <button
            type="submit"
            disabled={running || !appUrl.trim()}
            className="px-6 py-3.5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin-slow" />
                Analyzing {filledCompetitors > 0 ? `${filledCompetitors} competitor${filledCompetitors === 1 ? "" : "s"}` : "the field"}…
              </>
            ) : (
              <>
                <Target size={15} strokeWidth={2} />
                Run analysis
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <span className="text-[12px] text-ink-faint">
            {filledCompetitors > 0
              ? `${filledCompetitors} competitor URL${filledCompetitors === 1 ? "" : "s"} pasted`
              : "No URLs — we'll auto-discover"}
          </span>
        </div>
      </form>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <BenefitTile
          tile="tile-blue"
          title="Real listing data"
          desc="Live title, description, rating and review count pulled from each store."
        />
        <BenefitTile
          tile="tile-lilac"
          title="Keyword overlap"
          desc="See which keywords every competitor shares — and where you have airspace."
        />
        <BenefitTile
          tile="tile-mint"
          title="Actionable deltas"
          desc="Per-app stat deltas surface the gaps you can close in your next update."
        />
      </div>
    </div>
  );
}

function BenefitTile({ tile, title, desc }: { tile: string; title: string; desc: string }) {
  return (
    <div className="card-soft p-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center mb-4`}>
        <Sparkles size={16} strokeWidth={1.85} />
      </div>
      <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
      <p className="text-[12px] text-ink-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function Results({ analysis }: { analysis: CompetitorAnalysisResult }) {
  const scrapedCompetitors = analysis.competitors.filter((c) => c.scrapeOk);
  return (
    <div className="space-y-10">
      {/* Discovery banner */}
      <div className="card-soft p-5 flex items-start gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
          <Target size={16} strokeWidth={1.85} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">
            {analysis.discoveryMode === "auto"
              ? "Auto-discovered competitors"
              : analysis.discoveryMode === "manual"
                ? "Manual competitor list"
                : "Mixed discovery"}
          </p>
          <p className="text-[14px] text-ink mt-1">
            {scrapedCompetitors.length} of {analysis.competitors.length} competitor{analysis.competitors.length === 1 ? "" : "s"} successfully analyzed
            {analysis.discoveryMode === "auto"
              ? " — discovered via iTunes Search by your primary keyword."
              : "."}
          </p>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <section>
          <SectionHeader
            tile="tile-cream"
            icon={<TrendingUp size={16} strokeWidth={1.85} />}
            eyebrow="At a glance"
            title="Where you stand"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* Side-by-side cards */}
      <section>
        <SectionHeader
          tile="tile-blue"
          icon={<Apple size={16} strokeWidth={1.85} />}
          eyebrow="Side by side"
          title="Your app vs the competition"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppCard data={analysis.target} highlight />
          {analysis.competitors.map((c, i) => (
            <AppCard key={c.url + i} data={c} />
          ))}
        </div>
      </section>

      {/* Keyword overlap */}
      <section>
        <SectionHeader
          tile="tile-lilac"
          icon={<Hash size={16} strokeWidth={1.85} />}
          eyebrow="Keyword overlap"
          title="What everyone is targeting"
        />
        <div className="card-soft p-6">
          <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
            Words that appear in multiple listings are crowded — strong opportunities sit
            where you have airspace (★ = your listing carries this word).
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.keywordOverlap.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Not enough listing data to compute overlap.</p>
            ) : (
              analysis.keywordOverlap.map((k) => (
                <div
                  key={k.word}
                  className={`px-3 py-2 rounded-full text-[12px] font-medium border ${
                    k.targetHas
                      ? "border-transparent text-white"
                      : "border-line text-ink-muted"
                  }`}
                  style={k.targetHas ? { backgroundColor: "#2563EB" } : undefined}
                >
                  {k.targetHas && <span className="mr-1">★</span>}
                  {k.word}
                  <span className="ml-1.5 opacity-70">· {k.competitorsCount} comp.</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section>
        <SectionHeader
          tile="tile-mint"
          icon={<TrendingUp size={16} strokeWidth={1.85} />}
          eyebrow="Comparison table"
          title="Stat-by-stat breakdown"
        />
        <ComparisonTable target={analysis.target} competitors={analysis.competitors} />
      </section>

      {/* Next step */}
      <section className="card-soft p-7">
        <p className="eyebrow mb-3">Next step</p>
        <h2 className="text-[24px] font-semibold tracking-[-0.01em] mb-3" style={{ color: "#0B3D7A" }}>
          Turn this into copy
        </h2>
        <p className="text-[14px] text-ink-muted leading-relaxed mb-6 max-w-lg">
          Take the keyword airspace and rating gaps to the ASO Generator. It writes variants
          that target the words your competitors are missing.
        </p>
        <Link
          href="/generator"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
        >
          <Wand2 size={15} strokeWidth={2} />
          Open ASO Generator
        </Link>
      </section>
    </div>
  );
}

function InsightCard({ insight }: { insight: CompetitorInsight }) {
  const tile =
    insight.tone === "positive" ? "tile-mint"
    : insight.tone === "warning" ? "tile-cream"
    : "tile-blue";
  return (
    <div className="card-soft p-6 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center shrink-0`}>
        <TrendingUp size={16} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-ink tracking-[-0.01em]">{insight.label}</p>
        <p className="text-[13px] text-ink-muted leading-relaxed mt-1.5">{insight.detail}</p>
      </div>
    </div>
  );
}

function StoreIcon({ source }: { source: CompetitorAppData["source"] }) {
  if (source === "ios") return <Apple size={13} strokeWidth={1.85} />;
  if (source === "play") return <Smartphone size={13} strokeWidth={1.85} />;
  return <Globe size={13} strokeWidth={1.85} />;
}

function AppCard({ data, highlight }: { data: CompetitorAppData; highlight?: boolean }) {
  return (
    <div
      className={`card-soft p-6 ${highlight ? "ring-2" : ""}`}
      style={highlight ? { boxShadow: "0 0 0 2px #2563EB" } : undefined}
    >
      <div className="flex items-start gap-3 mb-4">
        {data.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.iconUrl}
            alt={data.title || "app icon"}
            className="w-12 h-12 rounded-xl shrink-0 bg-cream-deep"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl tile-blue flex items-center justify-center shrink-0 font-bold text-[16px]">
            {(data.title ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {highlight && (
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#2563EB" }}>
                You
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
              <StoreIcon source={data.source} />
              {data.source === "ios" ? "App Store" : data.source === "play" ? "Play Store" : "Unknown"}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-ink truncate">{data.title ?? "Could not fetch"}</p>
          <p className="text-[12px] text-ink-faint truncate">{data.developer ?? data.genre ?? ""}</p>
        </div>
      </div>

      {data.scrapeOk ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            {data.rating !== undefined && (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink">
                <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
                {data.rating.toFixed(1)}
              </span>
            )}
            {data.ratingCount !== undefined && (
              <span className="text-[12px] text-ink-muted">{fmtCompact(data.ratingCount)} ratings</span>
            )}
            {data.price && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cream-deep text-ink-muted">
                {data.price}
              </span>
            )}
          </div>

          {data.primaryKeyword && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint mb-1">Primary keyword</p>
              <p className="text-[13px] font-semibold" style={{ color: "#0B3D7A" }}>
                {data.primaryKeyword.word} <span className="text-ink-faint font-normal">({data.primaryKeyword.count}×)</span>
              </p>
            </div>
          )}

          {data.secondaryKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {data.secondaryKeywords.slice(0, 5).map((k) => (
                <span key={k.word} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cream-deep text-ink">
                  {k.word}
                </span>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint tabular-nums">
            <span>{data.fullDescLength} char desc</span>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-ink transition-colors"
            >
              View listing
              <ExternalLink size={11} />
            </a>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-ink-faint">
          Listing could not be fetched. URL may be private or the store blocked the request.
        </p>
      )}
    </div>
  );
}

function ComparisonTable({
  target,
  competitors,
}: {
  target: CompetitorAppData;
  competitors: CompetitorAppData[];
}) {
  const all = [target, ...competitors];
  const rows: Array<{
    label: string;
    cell: (d: CompetitorAppData) => React.ReactNode;
  }> = [
    {
      label: "Title length",
      cell: (d) => (d.titleLength > 0 ? <span>{d.titleLength}<span className="text-ink-faint"> chars</span></span> : "—"),
    },
    {
      label: "Rating",
      cell: (d) =>
        d.rating !== undefined ? (
          <span className="inline-flex items-center gap-1">
            <Star size={11} fill="#FBBF24" stroke="#FBBF24" />
            {d.rating.toFixed(1)}
          </span>
        ) : "—",
    },
    {
      label: "Ratings count",
      cell: (d) => (d.ratingCount !== undefined ? fmtCompact(d.ratingCount) : "—"),
    },
    {
      label: "Primary keyword",
      cell: (d) =>
        d.primaryKeyword ? (
          <span className="font-semibold" style={{ color: "#0B3D7A" }}>
            {d.primaryKeyword.word}
          </span>
        ) : "—",
    },
    {
      label: "Full desc length",
      cell: (d) => (d.fullDescLength > 0 ? <span>{d.fullDescLength}<span className="text-ink-faint"> chars</span></span> : "—"),
    },
    {
      label: "Developer",
      cell: (d) => d.developer ?? "—",
    },
    {
      label: "Genre",
      cell: (d) => d.genre ?? "—",
    },
  ];

  return (
    <div className="card-soft overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-line-soft">
            <th className="text-left text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint px-5 py-4 w-[160px]">
              Metric
            </th>
            {all.map((d, i) => (
              <th
                key={d.url + i}
                className="text-left text-[12px] font-semibold text-ink px-4 py-4"
                style={i === 0 ? { color: "#0B3D7A" } : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {i === 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: "#2563EB" }}>
                      You
                    </span>
                  )}
                  <span className="truncate max-w-[160px]">{d.title ?? "—"}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line-soft last:border-0">
              <td className="text-[12px] text-ink-muted px-5 py-3">{row.label}</td>
              {all.map((d, i) => (
                <td
                  key={d.url + i}
                  className={`text-[13px] px-4 py-3 ${i === 0 ? "font-semibold text-ink bg-accent-band-soft" : "text-ink"}`}
                >
                  {row.cell(d)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({
  tile,
  icon,
  eyebrow,
  title,
}: {
  tile: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${tile} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: "#0B3D7A" }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
