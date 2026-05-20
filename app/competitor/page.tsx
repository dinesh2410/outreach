"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { proxiedIcon } from "@/lib/icon-proxy";
import { useToast } from "@/components/shared/ToastProvider";
import type {
  CompetitorAnalysisResult,
  CompetitorAppData,
  CompetitorInsight,
  CompetitorRecord,
  CompetitorReportInsight,
  MyApp,
  UsageRecord,
} from "@/lib/types";
import { recordUsageForUser } from "@/lib/firestore";
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
  History,
  Trash2,
  RefreshCw,
  Archive,
  Download,
  ChartBar,
} from "@/components/shared/Icon";

type StoreFilter = "both" | "play" | "ios";

const COUNTRIES: { code: string; label: string }[] = [
  { code: "auto", label: "Auto (your location)" },
  { code: "us", label: "United States" },
  { code: "in", label: "India" },
  { code: "gb", label: "United Kingdom" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "br", label: "Brazil" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "au", label: "Australia" },
  { code: "ca", label: "Canada" },
];

// Deterministic id from (url, country) so re-running the same target in a
// different country saves as a distinct record. Same target + same country
// overwrites the prior record.
function competitorIdFor(url: string, country: string): string {
  const key = `${url}|${country}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }
  return `cmp_${(h >>> 0).toString(36)}`;
}

export default function CompetitorPage() {
  return (
    <Suspense fallback={null}>
      <CompetitorPageInner />
    </Suspense>
  );
}

function CompetitorPageInner() {
  const { user, loading: authLoading, competitors, recordCompetitor, removeCompetitor, myApps } =
    useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();

  const [appUrl, setAppUrl] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [stores, setStores] = useState<StoreFilter>("both");
  const [country, setCountry] = useState("auto");
  const [keyword, setKeyword] = useState("");
  const [analysis, setAnalysis] = useState<CompetitorAnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  // When showing a saved snapshot instead of a fresh fetch, this carries the
  // timestamp so we can render a banner + a Refresh button.
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?next=%2Fcompetitor");
  }, [user, authLoading, router]);

  // Core run helper — pulled out so deep-link replay (?url=) can reuse it.
  const runAnalysis = useCallback(
    async (
      url: string,
      manual: string[],
      storeFilter: StoreFilter,
      countryFilter: string,
      keywordFilter: string
    ) => {
      if (!url.trim()) return;
      setRunning(true);
      setAnalysis(null);
      setSnapshotAt(null);
      try {
        const res = await fetch("/api/competitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            competitors: manual,
            stores: storeFilter,
            country: countryFilter,
            keyword: keywordFilter.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as CompetitorAnalysisResult;
        setAnalysis(data);

        const scraped = data.competitors.filter((c) => c.scrapeOk);
        if (scraped.length > 0) {
          // Background LLM insight call — populates the Strategic Insight
          // card once Gemini returns. Failures are silent; the analysis page
          // is still useful without it.
          setInsightLoading(true);
          (async () => {
            try {
              const insightRes = await fetch("/api/competitor-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  target: data.target,
                  competitors: scraped,
                }),
              });
              if (!insightRes.ok) throw new Error(`HTTP ${insightRes.status}`);
              const insightData = (await insightRes.json()) as CompetitorReportInsight & {
                usage?: {
                  calls: UsageRecord["calls"];
                  totalInputTokens: number;
                  totalOutputTokens: number;
                  totalTokens: number;
                  estimatedCostUsd: number;
                  elapsedMs: number;
                };
              };
              const { usage: insightUsage, ...insight } = insightData;
              const enriched: CompetitorAnalysisResult = { ...data, reportInsight: insight };
              setAnalysis(enriched);

              const record: CompetitorRecord = {
                id: competitorIdFor(url.trim(), countryFilter),
                targetUrl: url.trim(),
                targetTitle: enriched.target.title,
                targetSource: enriched.target.source,
                country: countryFilter,
                competitorCount: enriched.competitors.length,
                successfulCount: scraped.length,
                discoveryMode: enriched.discoveryMode,
                createdAt: new Date().toISOString(),
                snapshot: enriched,
              };
              recordCompetitor(record);

              if (user && insightUsage) {
                const usageRecord: UsageRecord = {
                  id: `cmpi-${Date.now()}`,
                  userId: user.id,
                  userEmail: user.email,
                  tool: "competitor-insight",
                  context: `target: ${data.target.title ?? data.target.url}`,
                  totalInputTokens: insightUsage.totalInputTokens,
                  totalOutputTokens: insightUsage.totalOutputTokens,
                  totalTokens: insightUsage.totalTokens,
                  estimatedCostUsd: insightUsage.estimatedCostUsd,
                  elapsedMs: insightUsage.elapsedMs,
                  calls: insightUsage.calls,
                  createdAt: new Date().toISOString(),
                };
                recordUsageForUser(user.id, usageRecord).catch((err) =>
                  console.error("[competitor] insight usage persist failed:", err)
                );
              }
            } catch (err) {
              console.warn("[competitor] insight failed:", err);
              // Persist the analysis (without insight) so it's still in history.
              const record: CompetitorRecord = {
                id: competitorIdFor(url.trim(), countryFilter),
                targetUrl: url.trim(),
                targetTitle: data.target.title,
                targetSource: data.target.source,
                country: countryFilter,
                competitorCount: data.competitors.length,
                successfulCount: scraped.length,
                discoveryMode: data.discoveryMode,
                createdAt: new Date().toISOString(),
                snapshot: data,
              };
              recordCompetitor(record);
            } finally {
              setInsightLoading(false);
            }
          })();
        } else {
          // No scraped competitors → no insight to generate. Still persist.
          const record: CompetitorRecord = {
            id: competitorIdFor(url.trim(), countryFilter),
            targetUrl: url.trim(),
            targetTitle: data.target.title,
            targetSource: data.target.source,
            country: countryFilter,
            competitorCount: data.competitors.length,
            successfulCount: 0,
            discoveryMode: data.discoveryMode,
            createdAt: new Date().toISOString(),
            snapshot: data,
          };
          recordCompetitor(record);
        }
      } catch (err) {
        push(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setRunning(false);
      }
    },
    [push, recordCompetitor, user]
  );

  // Deep-link replay: if /competitor?url=... is loaded, prefer the saved
  // snapshot over a fresh fetch (so the user sees the exact data they saved).
  // Only re-fetch when there's no snapshot. The Refresh button on the result
  // page kicks off a new live run when they want one.
  //
  // IMPORTANT: wait for `authLoading` to settle before deciding — otherwise
  // the effect can fire while `competitors` is still empty (Firestore
  // hydration in flight), find no match, run a live analysis, and overwrite
  // the snapshot the user clicked from history.
  const replayedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || authLoading) return;
    const replay = search.get("url");
    if (!replay) return;
    const c = (search.get("country") ?? "auto").toLowerCase();
    const replayKey = `${replay}|${c}`;
    if (replayedRef.current === replayKey) return;

    const id = competitorIdFor(replay, c);
    const saved = competitors.find((r) => r.id === id);

    replayedRef.current = replayKey;
    setAppUrl(replay);
    setCountry(c);

    if (saved?.snapshot) {
      // Restore the exact saved view; URL-driven sync from external state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysis(saved.snapshot);
      setSnapshotAt(saved.createdAt);
      return;
    }
    runAnalysis(replay, [], stores, c, "");
  }, [search, user, authLoading, runAnalysis, stores, competitors]);

  if (authLoading || !user) return null;

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (running || !appUrl.trim()) return;
    const manual = competitorUrls.map((u) => u.trim()).filter(Boolean);
    await runAnalysis(appUrl, manual, stores, country, keyword);
  }

  function addCompetitorField() {
    if (competitorUrls.length >= 5) return;
    setCompetitorUrls([...competitorUrls, ""]);
  }

  function updateCompetitor(idx: number, value: string) {
    setCompetitorUrls((arr) => arr.map((v, i) => (i === idx ? value : v)));
  }

  function removeCompetitorField(idx: number) {
    setCompetitorUrls((arr) => (arr.length === 1 ? [""] : arr.filter((_, i) => i !== idx)));
  }

  function handleReset() {
    setAnalysis(null);
    setAppUrl("");
    setCompetitorUrls([""]);
    setSnapshotAt(null);
    setKeyword("");
  }

  async function handleRefresh() {
    if (running || !appUrl.trim()) return;
    const manual = competitorUrls.map((u) => u.trim()).filter(Boolean);
    await runAnalysis(appUrl, manual, stores, country, keyword);
  }

  return (
    <AppShell
      eyebrow="Tools · Competitor Watch"
      title={analysis ? "Competitor analysis" : "Who are you up against?"}
      description={
        analysis
          ? snapshotAt
            ? `Saved snapshot · captured ${relativeTime(snapshotAt)}.`
            : "Side-by-side comparison of your listing and your closest competitors."
          : "Paste your app URL — we'll find the top competitors automatically. Or paste specific competitor URLs to compare against a curated list."
      }
      actions={
        analysis ? (
          <div className="flex items-center gap-2">
            {snapshotAt && (
              <button
                onClick={handleRefresh}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {running ? (
                  <Loader2 size={13} className="animate-spin-slow" />
                ) : (
                  <RefreshCw size={13} strokeWidth={2} />
                )}
                {running ? "Refreshing…" : "Refresh data"}
              </button>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
            >
              New analysis
            </button>
          </div>
        ) : undefined
      }
    >
      {!analysis ? (
        <>
          <InputForm
            appUrl={appUrl}
            setAppUrl={setAppUrl}
            competitorUrls={competitorUrls}
            updateCompetitor={updateCompetitor}
            removeCompetitor={removeCompetitorField}
            addCompetitorField={addCompetitorField}
            stores={stores}
            setStores={setStores}
            country={country}
            setCountry={setCountry}
            keyword={keyword}
            setKeyword={setKeyword}
            onSubmit={handleRun}
            running={running}
            myApps={myApps}
          />
          <ReviewIntelligenceSection myApps={myApps} />
          {competitors.length > 0 && (
            <RecentAnalyses
              records={competitors}
              onDelete={removeCompetitor}
            />
          )}
        </>
      ) : (
        <>
          {snapshotAt && <SnapshotBanner savedAt={snapshotAt} onRefresh={handleRefresh} running={running} />}
          <Results analysis={analysis} insightLoading={insightLoading} />
          <ReviewIntelligenceSection myApps={myApps} />
        </>
      )}
    </AppShell>
  );
}

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
      className="card-soft p-5 mb-6 flex items-center gap-4 flex-wrap"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F2ECFE 100%)" }}
    >
      <div className="w-10 h-10 rounded-xl tile-lilac flex items-center justify-center shrink-0">
        <Archive size={16} strokeWidth={1.85} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Saved snapshot</p>
        <p className="text-[13px] text-ink-muted mt-1">
          You&apos;re viewing data captured {relativeTime(savedAt)} ({new Date(savedAt).toLocaleString()}).
          Competitors and listings drift — use Refresh to pull a fresh run.
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

function InputForm({
  appUrl,
  setAppUrl,
  competitorUrls,
  updateCompetitor,
  removeCompetitor,
  addCompetitorField,
  stores,
  setStores,
  country,
  setCountry,
  keyword,
  setKeyword,
  onSubmit,
  running,
  myApps,
}: {
  appUrl: string;
  setAppUrl: (v: string) => void;
  competitorUrls: string[];
  updateCompetitor: (i: number, v: string) => void;
  removeCompetitor: (i: number) => void;
  addCompetitorField: () => void;
  stores: StoreFilter;
  setStores: (s: StoreFilter) => void;
  country: string;
  setCountry: (c: string) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  running: boolean;
  myApps: MyApp[];
}) {
  const filledCompetitors = competitorUrls.filter((u) => u.trim()).length;
  const STORE_OPTIONS: { id: StoreFilter; label: string; hint: string }[] = [
    { id: "both", label: "Both stores", hint: "3 from Play + 2 from App Store" },
    { id: "play", label: "Play Store only", hint: "All 5 from Google Play" },
    { id: "ios", label: "App Store only", hint: "All 5 from App Store" },
  ];

  return (
    <div className="max-w-3xl">
      <form onSubmit={onSubmit} className="card-soft p-7 space-y-7">
        <div>
          <label className="eyebrow mb-3 block">Your app</label>
          {myApps.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {myApps.map((app) => {
                  const selected = appUrl === app.url;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setAppUrl(selected ? "" : app.url)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                        selected
                          ? "bg-ink text-white"
                          : "bg-cream-deep border border-line text-ink hover:border-ink-faint"
                      }`}
                    >
                      {app.iconUrl ? (
                        <img
                          src={proxiedIcon(app.iconUrl)}
                          alt=""
                          className="w-5 h-5 rounded-md"
                        />
                      ) : (
                        <Smartphone size={13} strokeWidth={1.85} />
                      )}
                      <span className="truncate max-w-[140px]">{app.name}</span>
                      <span className={`text-[10px] uppercase tracking-wider ${selected ? "text-white/70" : "text-ink-faint"}`}>
                        {app.source === "ios" ? "iOS" : "Play"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-px bg-line" />
                <span className="text-[11px] text-ink-faint uppercase tracking-widest">or enter URL</span>
                <div className="flex-1 h-px bg-line" />
              </div>
            </div>
          )}
          <input
            type="url"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            required
            placeholder="https://apps.apple.com/… or https://play.google.com/store/apps/details?id=…"
            className="w-full px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
          <p className="text-[12px] text-ink-faint mt-2">
            {myApps.length > 0
              ? "Pick from your apps above, or paste any store URL."
              : "We’ll fetch your listing, then find or compare competitors."}
          </p>
        </div>

        <div>
          <label className="eyebrow mb-3 block">
            Target keyword <span className="text-ink-faint font-normal tracking-normal normal-case">· optional</span>
          </label>
          <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
            The search term you want to rank for. We&apos;ll auto-discover the apps competing for this exact keyword. Leave empty to use your app&apos;s primary keyword (detected from the title and description).
          </p>
          <div className="relative">
            <Hash size={15} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              maxLength={80}
              placeholder='e.g. "habit tracker", "12 testers", "budget planner"'
              className="w-full pl-12 pr-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="eyebrow mb-3 block">
            Which stores should competitors come from?
          </label>
          <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
            Only affects auto-discovery. Pasting specific competitor URLs below
            always uses those URLs verbatim regardless of this setting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STORE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStores(opt.id)}
                className={`text-left px-4 py-3 rounded-2xl border transition-all ${
                  stores === opt.id
                    ? "border-transparent text-white"
                    : "border-line bg-cream-deep text-ink hover:border-ink-faint"
                }`}
                style={stores === opt.id ? { backgroundColor: "#2563EB" } : undefined}
              >
                <div className="text-[13px] font-semibold">{opt.label}</div>
                <div className={`text-[11px] mt-0.5 ${stores === opt.id ? "text-white/85" : "text-ink-muted"}`}>
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="eyebrow mb-3 block">Country / region</label>
          <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
            Auto-discovery returns whichever apps rank in this market. &ldquo;Auto&rdquo;
            uses your own location (detected from your IP) so you see the apps
            ranking in your market. Pick a specific country to analyze a different
            market — e.g. running a US-market analysis from India.
          </p>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors appearance-none cursor-pointer"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow mb-3 block">
            Competitor URLs <span className="text-ink-faint font-normal tracking-normal normal-case">· optional, up to 5</span>
          </label>
          <p className="text-[12px] text-ink-muted mb-3 leading-relaxed">
            Leave empty for auto-discovery — we&apos;ll search by the target keyword above (or your
            app&apos;s primary keyword if you didn&apos;t set one). Paste specific competitor URLs to
            compare against a curated list instead.
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

function ReviewIntelligenceSection({ myApps }: { myApps: MyApp[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    router.push(`/competitor/reviews?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl tile-rose flex items-center justify-center">
          <ChartBar size={16} strokeWidth={1.85} />
        </div>
        <div>
          <p className="eyebrow">Intelligence</p>
          <h2
            className="text-[22px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0B3D7A" }}
          >
            Review Intelligence
          </h2>
        </div>
      </div>

      <p className="text-[13px] text-ink-muted leading-relaxed mb-5 max-w-2xl">
        Analyze real user reviews from any app and extract themes, sentiment, feature requests, and market opportunities using AI.
      </p>

      <form onSubmit={handleGo} className="card-soft p-5 max-w-2xl">
        {myApps.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-2.5">Your apps</p>
            <div className="flex flex-wrap gap-2">
              {myApps.map((app) => {
                const selected = url === app.url;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setUrl(selected ? "" : app.url)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                      selected
                        ? "bg-ink text-white"
                        : "bg-cream-deep border border-line text-ink hover:border-ink-faint"
                    }`}
                  >
                    {app.iconUrl ? (
                      <img src={proxiedIcon(app.iconUrl)} alt="" className="w-5 h-5 rounded-md" />
                    ) : (
                      <Smartphone size={13} strokeWidth={1.85} />
                    )}
                    <span className="truncate max-w-[140px]">{app.name}</span>
                    <span className={`text-[10px] uppercase tracking-wider ${selected ? "text-white/70" : "text-ink-faint"}`}>
                      {app.source === "ios" ? "iOS" : "Play"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[11px] text-ink-faint uppercase tracking-widest">or enter URL</span>
              <div className="flex-1 h-px bg-line" />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://apps.apple.com/… or https://play.google.com/store/apps/…"
            className="flex-1 px-5 py-3 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-5 py-3 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <Sparkles size={14} strokeWidth={2} />
            Analyze
          </button>
        </div>
      </form>
    </section>
  );
}

function RecentAnalyses({
  records,
  onDelete,
}: {
  records: CompetitorRecord[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center">
          <History size={16} strokeWidth={1.85} />
        </div>
        <div>
          <p className="eyebrow">History</p>
          <h2
            className="text-[22px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0B3D7A" }}
          >
            Your recent analyses
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.slice(0, 9).map((r) => {
          const replayHref =
            `/competitor?url=${encodeURIComponent(r.targetUrl)}` +
            `&country=${r.country ?? "auto"}`;
          const modeTile =
            r.discoveryMode === "auto"
              ? "tile-lilac"
              : r.discoveryMode === "manual"
                ? "tile-mint"
                : "tile-cream";
          return (
            <div key={r.id} className="card-soft p-5 group relative">
              <Link href={replayHref} className="block">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${modeTile}`}
                  >
                    {r.discoveryMode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
                    {r.targetSource === "ios" ? (
                      <Apple size={11} strokeWidth={1.85} />
                    ) : r.targetSource === "play" ? (
                      <Smartphone size={11} strokeWidth={1.85} />
                    ) : (
                      <Globe size={11} strokeWidth={1.85} />
                    )}
                    {r.targetSource === "ios"
                      ? "App Store"
                      : r.targetSource === "play"
                        ? "Play Store"
                        : "Unknown"}
                  </span>
                </div>

                <p className="text-[15px] font-semibold text-ink truncate">
                  {r.targetTitle ?? "Untitled listing"}
                </p>
                <p className="text-[11px] text-ink-faint truncate mt-0.5 font-mono">
                  {r.targetUrl}
                </p>

                <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>
                    {r.successfulCount}/{r.competitorCount} scraped
                    {r.country && r.country !== "auto" && (
                      <> · {r.country.toUpperCase()}</>
                    )}
                  </span>
                  <span className="tabular-nums">{relativeTime(r.createdAt)}</span>
                </div>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(r.id);
                }}
                aria-label="Delete analysis"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
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

function Results({
  analysis,
  insightLoading,
}: {
  analysis: CompetitorAnalysisResult;
  insightLoading: boolean;
}) {
  const scrapedCompetitors = analysis.competitors.filter((c) => c.scrapeOk);

  // Computed positioning + cohort stats.
  const cohort = scrapedCompetitors.map((c) => ({
    rating: c.rating,
    ratingCount: c.ratingCount,
    genre: c.genre,
  }));
  const ratings = cohort
    .map((c) => c.rating)
    .filter((r): r is number => typeof r === "number");
  const ratingCounts = cohort
    .map((c) => c.ratingCount)
    .filter((r): r is number => typeof r === "number")
    .sort((a, b) => a - b);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const medianRatingCount =
    ratingCounts.length > 0 ? ratingCounts[Math.floor(ratingCounts.length / 2)] : null;
  const topComp = topCompetitorOfCohort(scrapedCompetitors);
  const topDownloadsApp = scrapedCompetitors
    .filter((c) => typeof c.downloads === "number")
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))[0];

  const positioning = computePositioning({
    targetRating: analysis.target.rating,
    targetRatingCount: analysis.target.ratingCount,
    cohortRatings: ratings,
    cohortRatingCounts: ratingCounts,
  });

  const ratingBuckets = bucketize(
    ratings.concat(typeof analysis.target.rating === "number" ? [analysis.target.rating] : []),
    [
      { label: "4.7+", min: 4.7, max: 5.01 },
      { label: "4.4–4.7", min: 4.4, max: 4.7 },
      { label: "4.0–4.4", min: 4.0, max: 4.4 },
      { label: "< 4.0", min: 0, max: 4.0 },
    ]
  );
  const categoryShare = aggregateBy(
    [analysis.target, ...scrapedCompetitors],
    (a) => a.genre
  ).slice(0, 5);

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
              ? " — discovered via App Store search by your primary keyword."
              : "."}
          </p>
        </div>
      </div>

      {/* Positioning gauge + signal tiles */}
      {scrapedCompetitors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3">
          <PositioningCard score={positioning.score} tier={positioning.tier} />
          <div className="grid grid-cols-2 gap-3">
            <SignalTile
              icon={<Star size={14} fill="#FBBF24" stroke="#FBBF24" />}
              label="Competitor avg rating"
              value={avgRating !== null ? avgRating.toFixed(2) : "—"}
              sub={`Yours: ${analysis.target.rating?.toFixed(2) ?? "—"}`}
            />
            <SignalTile
              icon={<TrendingUp size={14} className="text-ink-muted" />}
              label="Median ratings"
              value={medianRatingCount !== null ? fmtCompact(medianRatingCount) : "—"}
              sub={`Yours: ${
                typeof analysis.target.ratingCount === "number"
                  ? fmtCompact(analysis.target.ratingCount)
                  : "—"
              }`}
            />
            <SignalTile
              icon={<Download size={14} className="text-ink-muted" />}
              label="Top downloads"
              value={topDownloadsApp ? fmtCompact(topDownloadsApp.downloads!) : "—"}
              sub={topDownloadsApp?.title ?? "no data"}
              truncate
            />
            <SignalTile
              icon={<Target size={14} className="text-ink-muted" />}
              label="Top competitor"
              value={topComp?.title ?? "—"}
              sub={topComp ? `${fmtCompact(topComp.downloads ?? 0)} downloads · ${topComp.rating?.toFixed(1) ?? "?"} ★` : "—"}
              truncate
            />
          </div>
        </div>
      )}

      {/* Charts row */}
      {scrapedCompetitors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <RatingDistributionChart buckets={ratingBuckets} total={ratings.length + 1} />
          <CategoryShareChart slices={categoryShare} total={1 + scrapedCompetitors.length} />
          <PositioningScatterChart
            target={analysis.target}
            competitors={scrapedCompetitors}
          />
        </div>
      )}

      {/* Strategic LLM insight */}
      {(analysis.reportInsight || insightLoading) && (
        <StrategicInsightCard insight={analysis.reportInsight} loading={insightLoading} />
      )}

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
          Take the keyword airspace and rating gaps to the ASO Generator. It writes a listing
          that targets the words your competitors are missing.
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
  const [iconBroken, setIconBroken] = useState(false);
  const iconSrc = proxiedIcon(data.iconUrl);
  const showIcon = iconSrc && !iconBroken;
  return (
    <div
      className={`card-soft p-6 ${highlight ? "ring-2" : ""}`}
      style={highlight ? { boxShadow: "0 0 0 2px #2563EB" } : undefined}
    >
      <div className="flex items-start gap-3 mb-4">
        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconSrc}
            alt={data.title ?? "App icon"}
            onError={() => setIconBroken(true)}
            className="w-12 h-12 rounded-xl shrink-0 bg-cream-deep object-cover"
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
            {data.downloads !== undefined && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                <Download size={11} />
                {fmtCompact(data.downloads)}
              </span>
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
      label: "Downloads",
      cell: (d) => (d.downloads !== undefined ? fmtCompact(d.downloads) : "—"),
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

// ─── Positioning (cohort comparison) ──────────────────────────────────────

function logNormalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  const logVal = Math.log10(value);
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return (logVal - logMin) / (logMax - logMin);
}

// 0-100 positioning score for the target vs the competitor cohort.
// - 50 = roughly average across the cohort
// - >70 = ahead
// - <30 = behind
function computePositioning(args: {
  targetRating: number | undefined;
  targetRatingCount: number | undefined;
  cohortRatings: number[];
  cohortRatingCounts: number[];
}): { score: number; tier: "ahead" | "comparable" | "behind" } {
  const { targetRating, targetRatingCount, cohortRatings, cohortRatingCounts } = args;
  if (cohortRatings.length === 0 && cohortRatingCounts.length === 0) {
    return { score: 50, tier: "comparable" };
  }
  const ratingPercentile =
    typeof targetRating === "number"
      ? percentile(cohortRatings, targetRating)
      : 0.5;
  const countPercentile =
    typeof targetRatingCount === "number"
      ? percentile(cohortRatingCounts.map((n) => Math.log10(n || 1)), Math.log10(targetRatingCount || 1))
      : 0.5;
  const score = Math.round((0.4 * ratingPercentile + 0.6 * countPercentile) * 100);
  const tier = score >= 65 ? "ahead" : score >= 35 ? "comparable" : "behind";
  return { score, tier };
}

function percentile(sortedish: number[], value: number): number {
  if (sortedish.length === 0) return 0.5;
  const sorted = [...sortedish].sort((a, b) => a - b);
  let below = 0;
  for (const v of sorted) {
    if (v < value) below++;
  }
  return below / sorted.length;
}

function PositioningCard({
  score,
  tier,
}: {
  score: number;
  tier: "ahead" | "comparable" | "behind";
}) {
  const color = tier === "ahead" ? "#16A34A" : tier === "comparable" ? "#D97706" : "#DC2626";
  const label = tier === "ahead" ? "Ahead" : tier === "comparable" ? "Comparable" : "Behind";
  const copy =
    tier === "ahead"
      ? "Your app sits above most of the competitors on rating quality and volume."
      : tier === "comparable"
        ? "You're in the same tier as most competitors. Differentiation matters here."
        : "Most competitors lead on rating quality or volume. ASO + reviews are the lever.";

  const radius = 56;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="card-soft p-5 flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint mt-1">
            / 100
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">Positioning</p>
        <p className="text-[18px] font-semibold mt-1" style={{ color }}>
          {label}
        </p>
        <p className="text-[12px] text-ink-muted leading-snug mt-1.5">{copy}</p>
      </div>
    </div>
  );
}

// ─── Signal tile ──────────────────────────────────────────────────────────

function SignalTile({
  icon,
  label,
  value,
  sub,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  truncate?: boolean;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-1.5 mb-2 text-ink-muted">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">{label}</p>
      </div>
      <p
        className={`text-[20px] font-semibold text-ink tabular-nums ${truncate ? "truncate" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────

function bucketize(
  values: number[],
  ranges: { label: string; min: number; max: number }[]
): { label: string; count: number; pct: number }[] {
  return ranges.map((r) => {
    const count = values.filter((v) => v >= r.min && v < r.max).length;
    const pct = values.length > 0 ? count / values.length : 0;
    return { label: r.label, count, pct };
  });
}

function aggregateBy<T>(
  items: T[],
  keyFn: (t: T) => string | undefined
): { label: string; count: number; pct: number }[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    total++;
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, pct: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

function topCompetitorOfCohort(apps: CompetitorAppData[]): CompetitorAppData | null {
  if (apps.length === 0) return null;
  const scored = apps
    .filter((a) => a.scrapeOk)
    .map((a) => {
      const dlScore = Math.log10(Math.max(a.downloads ?? 1, 1));
      const ratingScore = (a.rating ?? 0) * 2;
      const reviewScore = Math.log10(Math.max(a.ratingCount ?? 1, 1));
      return { app: a, score: dlScore * 3 + ratingScore + reviewScore };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.app ?? apps[0];
}

function RatingDistributionChart({
  buckets,
  total,
}: {
  buckets: { label: string; count: number; pct: number }[];
  total: number;
}) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Star size={12} fill="#FBBF24" stroke="#FBBF24" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Rating distribution
        </p>
      </div>
      {total === 0 ? (
        <p className="text-[12px] text-ink-faint">No rating data.</p>
      ) : (
        <ul className="space-y-2.5">
          {buckets.map((b) => (
            <li key={b.label} className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-ink-muted tabular-nums w-[52px] shrink-0">
                {b.label}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-cream-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(b.count / max) * 100}%`, backgroundColor: "#2563EB" }}
                />
              </div>
              <span className="text-[11px] text-ink-faint tabular-nums w-8 text-right shrink-0">
                {b.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryShareChart({
  slices,
  total,
}: {
  slices: { label: string; count: number; pct: number }[];
  total: number;
}) {
  const palette = ["#2563EB", "#7C3AED", "#16A34A", "#F59E0B", "#9CA3AF"];
  const radius = 36;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;
  let cumPct = 0;

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Hash size={12} className="text-ink-muted" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Category mix
        </p>
      </div>
      {slices.length === 0 ? (
        <p className="text-[12px] text-ink-faint">No category data.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={14} />
              {slices.map((s, i) => {
                const dash = s.pct * circumference;
                const offset = cumPct * circumference;
                cumPct += s.pct;
                return (
                  <circle
                    key={s.label}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={palette[i % palette.length]}
                    strokeWidth={14}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[18px] font-bold tabular-nums text-ink">{total}</span>
            </div>
          </div>
          <ul className="flex-1 min-w-0 space-y-1.5">
            {slices.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: palette[i % palette.length] }}
                />
                <span className="text-ink truncate flex-1">{s.label}</span>
                <span className="text-ink-faint tabular-nums shrink-0">
                  {s.count} · {Math.round(s.pct * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Scatter: rating (x) × log(rating count) (y). Target highlighted in accent
// colour; cohort plotted in neutral grey. Uses FIXED axes (3.0–5.0★ and
// 100–10M ratings) so the dots don't snap to the corners when there are few
// data points, and gridlines + corner labels make the chart legible at a
// glance.
function PositioningScatterChart({
  target,
  competitors,
}: {
  target: CompetitorAppData;
  competitors: CompetitorAppData[];
}) {
  const targetPlottable =
    typeof target.rating === "number" &&
    typeof target.ratingCount === "number" &&
    target.ratingCount > 0;
  const competitorPoints = competitors.filter(
    (c): c is CompetitorAppData & { rating: number; ratingCount: number } =>
      typeof c.rating === "number" &&
      typeof c.ratingCount === "number" &&
      c.ratingCount > 0
  );
  const totalPlottable = (targetPlottable ? 1 : 0) + competitorPoints.length;

  // Fixed plot ranges so dots don't get pushed to corners with sparse data.
  const X_MIN = 3.0;
  const X_MAX = 5.0;
  const Y_LOG_MIN = 2; // 100 ratings
  const Y_LOG_MAX = 7; // 10M ratings

  const w = 300;
  const h = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 42 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  const xFor = (rating: number) =>
    padding.left + ((clamp(rating, X_MIN, X_MAX) - X_MIN) / (X_MAX - X_MIN)) * plotW;
  const yFor = (count: number) => {
    const log = clamp(Math.log10(Math.max(1, count)), Y_LOG_MIN, Y_LOG_MAX);
    return padding.top + plotH - ((log - Y_LOG_MIN) / (Y_LOG_MAX - Y_LOG_MIN)) * plotH;
  };

  const yTicks = [
    { log: 2, label: "100" },
    { log: 3, label: "1k" },
    { log: 4, label: "10k" },
    { log: 5, label: "100k" },
    { log: 6, label: "1M" },
  ];
  const xTicks = [3, 3.5, 4, 4.5, 5];

  return (
    <div className="card-soft p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <TrendingUp size={12} className="text-ink-muted" />
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
          Position vs competitors
        </p>
      </div>
      {totalPlottable < 2 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-[12px] text-ink-faint text-center max-w-[180px]">
            Not enough rating data to chart — most competitors are missing review counts.
          </p>
        </div>
      ) : (
        <>
          <svg
            width="100%"
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* y gridlines + labels */}
            {yTicks.map((t) => {
              const y =
                padding.top + plotH - ((t.log - Y_LOG_MIN) / (Y_LOG_MAX - Y_LOG_MIN)) * plotH;
              return (
                <g key={t.log}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={w - padding.right}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    fontSize="9"
                    fill="#9CA3AF"
                    textAnchor="end"
                  >
                    {t.label}
                  </text>
                </g>
              );
            })}

            {/* x gridlines + labels */}
            {xTicks.map((r) => {
              const x = padding.left + ((r - X_MIN) / (X_MAX - X_MIN)) * plotW;
              return (
                <g key={r}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotH}
                    stroke="#F8FAFC"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={h - padding.bottom + 14}
                    fontSize="9"
                    fill="#9CA3AF"
                    textAnchor="middle"
                  >
                    {r.toFixed(1)}★
                  </text>
                </g>
              );
            })}

            {/* axis lines */}
            <line
              x1={padding.left}
              y1={padding.top + plotH}
              x2={w - padding.right}
              y2={padding.top + plotH}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + plotH}
              stroke="#E2E8F0"
              strokeWidth={1}
            />

            {/* competitor dots */}
            {competitorPoints.map((c, i) => (
              <circle
                key={i}
                cx={xFor(c.rating)}
                cy={yFor(c.ratingCount)}
                r={4}
                fill="#9CA3AF"
                fillOpacity={0.7}
              >
                <title>
                  {c.title ?? "Competitor"} — {c.rating.toFixed(1)}★ ({fmtCompact(c.ratingCount)})
                </title>
              </circle>
            ))}

            {/* target dot */}
            {targetPlottable && (
              <>
                <circle
                  cx={xFor(target.rating as number)}
                  cy={yFor(target.ratingCount as number)}
                  r={10}
                  fill="#2563EB"
                  fillOpacity={0.18}
                />
                <circle
                  cx={xFor(target.rating as number)}
                  cy={yFor(target.ratingCount as number)}
                  r={5.5}
                  fill="#2563EB"
                >
                  <title>
                    {target.title ?? "Your app"} — {(target.rating as number).toFixed(1)}★ (
                    {fmtCompact(target.ratingCount as number)})
                  </title>
                </circle>
              </>
            )}
          </svg>

          <div className="flex items-center justify-between mt-2 text-[10px] text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ink-faint/60" />
              Competitor ({competitorPoints.length})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Your app
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Strategic LLM insight ────────────────────────────────────────────────

function StrategicInsightCard({
  insight,
  loading,
}: {
  insight: CompetitorReportInsight | undefined;
  loading: boolean;
}) {
  const levelStyle =
    insight?.positioningLevel === "ahead"
      ? { bg: "bg-green/10", text: "text-green", border: "border-green/30" }
      : insight?.positioningLevel === "behind"
        ? { bg: "bg-warn/10", text: "text-warn", border: "border-warn/30" }
        : { bg: "bg-gold/10", text: "text-gold", border: "border-gold/30" };

  return (
    <div
      className="card-soft p-6"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #FDF2FA 100%)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-xl tile-lilac flex items-center justify-center">
          <Sparkles size={16} strokeWidth={1.85} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">Strategic insight</p>
          {loading ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 size={13} className="animate-spin text-ink-faint" />
              <p className="text-[13px] text-ink-muted">Analysing the competitive landscape…</p>
            </div>
          ) : insight ? (
            <p className="text-[15px] font-medium text-ink mt-1 leading-snug">{insight.summary}</p>
          ) : null}
        </div>
        {insight && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}
          >
            {insight.positioningLevel === "ahead"
              ? "You're ahead"
              : insight.positioningLevel === "behind"
                ? "You're behind"
                : "Comparable"}
          </span>
        )}
      </div>

      {insight && (
        <>
          <p className="text-[12px] text-ink-muted mb-5 pl-13">{insight.positioningRationale}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="eyebrow mb-3">Observations</p>
              <ul className="space-y-2">
                {insight.observations.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink leading-snug">
                    <span className="text-accent mt-1 shrink-0">•</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              {insight.topThreat && (
                <div>
                  <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
                    <Target size={11} />
                    Top threat
                  </p>
                  <p className="text-[13px] text-ink leading-snug">{insight.topThreat}</p>
                </div>
              )}
              {insight.whitespace && (
                <div>
                  <p className="eyebrow mb-2 inline-flex items-center gap-1.5">
                    <Sparkles size={11} />
                    Whitespace
                  </p>
                  <p className="text-[13px] text-ink leading-snug">{insight.whitespace}</p>
                </div>
              )}
              {!insight.topThreat && !insight.whitespace && (
                <p className="text-[12px] text-ink-faint">
                  No single competitor stands out and no clear whitespace surfaced.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
