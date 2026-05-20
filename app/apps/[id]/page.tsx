"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { proxiedIcon } from "@/lib/icon-proxy";
import type {
  AppEntry,
  MyApp,
  AuditRecord,
  CompetitorRecord,
  KeywordRankRecord,
  GenerationResult,
} from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  Apple,
  Smartphone,
  Sparkles,
  Target,
  Tag,
  Wand2,
  ChevronRight,
  Edit3,
  Check,
  X,
  Trash2,
  Clock,
} from "@/components/shared/Icon";

// Normalise a Play / App Store URL into a stable key so we can match the same
// listing across records that may have different query params or locale paths.
function normalizeStoreUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "play.google.com") {
      const id = u.searchParams.get("id");
      return id ? `play:${id.toLowerCase()}` : u.toString().toLowerCase();
    }
    if (u.hostname === "apps.apple.com" || u.hostname === "itunes.apple.com") {
      const m = u.pathname.match(/id(\d+)/);
      return m ? `ios:${m[1]}` : u.toString().toLowerCase();
    }
  } catch {
    /* not a URL — fall through */
  }
  return url.toLowerCase();
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

export default function AppDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading, myApps, apps } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push(`/auth?next=%2Fapps%2F${params.id}`);
  }, [user, loading, router, params.id]);

  const myApp = useMemo(() => myApps.find((a) => a.id === params.id), [myApps, params.id]);
  const legacyApp = useMemo(() => apps.find((a) => a.id === params.id), [apps, params.id]);

  if (loading || !user) return null;

  // New "Your apps" dashboard — primary case.
  if (myApp) return <MyAppDashboard app={myApp} />;

  // Legacy Library AppEntry detail — fallback for old links from /library and /dashboard.
  if (legacyApp) return <LegacyAppEntryDetail app={legacyApp} />;

  return (
    <AppShell eyebrow="Workspace · Your apps" title="App not found">
      <div className="card-soft p-8 text-center">
        <p className="text-ink-muted mb-4">We couldn&apos;t find a saved app with that id.</p>
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors"
        >
          <ArrowLeft size={13} />
          Back to your apps
        </Link>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW: "Your apps" dashboard — full report for a saved MyApp
// ═══════════════════════════════════════════════════════════════════════════

function MyAppDashboard({ app }: { app: MyApp }) {
  const router = useRouter();
  const {
    saveMyApp,
    removeMyApp,
    audits,
    competitors,
    keywordRanks,
    history,
  } = useAuth();
  const { push } = useToast();
  const [editName, setEditName] = useState(false);
  const [draftName, setDraftName] = useState("");

  const appKey = normalizeStoreUrl(app.url);
  const relatedAudits = useMemo(
    () => audits.filter((r) => normalizeStoreUrl(r.url) === appKey),
    [audits, appKey]
  );
  const relatedCompetitors = useMemo(
    () => competitors.filter((r) => normalizeStoreUrl(r.targetUrl) === appKey),
    [competitors, appKey]
  );
  const relatedKeywordRanks = useMemo(
    () =>
      keywordRanks.filter((r) =>
        (r.snapshot?.apps ?? []).some((a) => normalizeStoreUrl(a.url) === appKey)
      ),
    [keywordRanks, appKey]
  );
  const relatedGenerations = useMemo(() => {
    const lcName = app.name.trim().toLowerCase();
    return history.filter((g) => {
      const matchByUrl =
        g.input.storeUrl && normalizeStoreUrl(g.input.storeUrl) === appKey;
      const matchByName = g.input.appName.trim().toLowerCase() === lcName;
      return matchByUrl || matchByName;
    });
  }, [history, app.name, appKey]);

  const StoreIcon = app.source === "ios" ? Apple : Smartphone;
  const iconSrc = proxiedIcon(app.iconUrl);

  function commitNameEdit() {
    const next = draftName.trim();
    if (!next || next === app.name) {
      setEditName(false);
      return;
    }
    saveMyApp({ ...app, name: next, updatedAt: new Date().toISOString() });
    setEditName(false);
    push("Renamed", "success");
  }

  function handleDelete() {
    if (!confirm(`Remove "${app.name}" from your apps?`)) return;
    removeMyApp(app.id);
    router.push("/apps");
  }

  return (
    <AppShell eyebrow="Workspace · Your apps" title={app.name}>
      <Link
        href="/apps"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft size={12} />
        Back to all apps
      </Link>

      <div className="card-soft p-6 mb-6">
        <div className="flex items-start gap-5 mb-5">
          {iconSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconSrc}
              alt={app.name}
              className="w-20 h-20 rounded-3xl shrink-0 bg-cream-deep object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl tile-blue flex items-center justify-center shrink-0 font-bold text-[28px]">
              {app.name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNameEdit();
                    if (e.key === "Escape") setEditName(false);
                  }}
                  autoFocus
                  className="px-3 py-1.5 rounded-lg bg-cream-deep border border-ink-faint outline-none text-[24px] font-semibold text-ink min-w-0 flex-1"
                />
                <button
                  onClick={commitNameEdit}
                  className="p-1.5 rounded-lg text-green hover:bg-green/10 transition-colors"
                  aria-label="Save"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditName(false)}
                  className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-colors"
                  aria-label="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 group">
                <h1 className="text-[28px] font-semibold text-ink leading-tight">{app.name}</h1>
                <button
                  onClick={() => {
                    setDraftName(app.name);
                    setEditName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep transition-all"
                  aria-label="Rename"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 text-[12px] text-ink-muted flex-wrap">
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={11} strokeWidth={1.85} />
                {app.source === "ios" ? "App Store" : "Play Store"}
              </span>
              {app.developer && <span>· {app.developer}</span>}
              {app.category && (
                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-[0.1em]">
                  {app.category}
                </span>
              )}
            </div>
            {app.shortDesc && (
              <p className="text-[13px] text-ink mt-3 leading-snug">{app.shortDesc}</p>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="shrink-0 p-2 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5 transition-colors"
            aria-label="Remove from your apps"
            title="Remove from your apps"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-line-soft">
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line text-[12px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
          >
            <ExternalLink size={12} />
            Open on store
          </a>
          <QuickAction
            href={`/score?url=${encodeURIComponent(app.url)}`}
            icon={<Sparkles size={12} />}
            label="Run ASO Score"
          />
          <QuickAction
            href={`/competitor?url=${encodeURIComponent(app.url)}&country=auto`}
            icon={<Target size={12} />}
            label="Run Competitor Watch"
          />
          <QuickAction href="/generator" icon={<Wand2 size={12} />} label="Generate listing" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatTile label="ASO audits" value={relatedAudits.length} icon={<Sparkles size={14} />} />
        <StatTile
          label="Competitor analyses"
          value={relatedCompetitors.length}
          icon={<Target size={14} />}
        />
        <StatTile
          label="Keyword checks"
          value={relatedKeywordRanks.length}
          icon={<Tag size={14} />}
        />
        <StatTile
          label="Listings generated"
          value={relatedGenerations.length}
          icon={<Wand2 size={14} />}
        />
      </div>

      <div className="space-y-8">
        <AuditsSection records={relatedAudits} app={app} />
        <CompetitorsSection records={relatedCompetitors} app={app} />
        <KeywordRanksSection records={relatedKeywordRanks} appKey={appKey} />
        <GenerationsSection records={relatedGenerations} />
      </div>
    </AppShell>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-white text-[12px] font-medium hover:bg-night-soft transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-1.5 mb-2 text-ink-muted">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">{label}</p>
      </div>
      <p className="text-[24px] font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function AuditsSection({ records, app }: { records: AuditRecord[]; app: MyApp }) {
  return (
    <Section
      icon={<Sparkles size={14} />}
      label="ASO Score audits"
      count={records.length}
      cta={{
        href: `/score?url=${encodeURIComponent(app.url)}`,
        label: records.length === 0 ? "Run a score check" : "Run another check",
      }}
    >
      {records.length === 0 ? (
        <EmptySection
          message="No ASO Score audits yet for this app."
          hint="Run a Score check to see how this listing scores across the ranking signals."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/score/report?url=${encodeURIComponent(r.url ?? "")}`}
              className="card-soft p-4 hover:border-accent/40 transition-colors block"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[28px] font-semibold tabular-nums text-ink">
                  {r.score ?? "—"}
                </span>
                {r.grade && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-[0.1em]">
                    {r.grade}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-ink-muted">
                {r.createdAt ? relativeTime(r.createdAt) : "—"}
              </p>
              <div className="mt-2 pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                <span>View report</span>
                <ChevronRight size={11} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

function CompetitorsSection({
  records,
  app,
}: {
  records: CompetitorRecord[];
  app: MyApp;
}) {
  return (
    <Section
      icon={<Target size={14} />}
      label="Competitor Watch analyses"
      count={records.length}
      cta={{
        href: `/competitor?url=${encodeURIComponent(app.url)}&country=auto`,
        label: records.length === 0 ? "Run competitor analysis" : "Run another analysis",
      }}
    >
      {records.length === 0 ? (
        <EmptySection
          message="No competitor analyses yet for this app."
          hint="Run a Competitor Watch to discover and compare against the apps you're up against."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((r) => {
            const country = r.country ?? "auto";
            const successful = r.successfulCount ?? 0;
            const total = r.competitorCount ?? 0;
            const discovery = r.discoveryMode ?? "auto";
            return (
              <Link
                key={r.id}
                href={`/competitor?url=${encodeURIComponent(r.targetUrl)}&country=${country}`}
                className="card-soft p-4 hover:border-accent/40 transition-colors block"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[14px] font-semibold text-ink truncate">
                    {successful} of {total} competitors
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
                    {country.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-ink-faint truncate">
                  {discovery} discovery · {relativeTime(r.createdAt)}
                </p>
                <div className="mt-2 pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>View analysis</span>
                  <ChevronRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function KeywordRanksSection({
  records,
  appKey,
}: {
  records: KeywordRankRecord[];
  appKey: string;
}) {
  return (
    <Section
      icon={<Tag size={14} />}
      label="Keywords this app ranks for"
      count={records.length}
      cta={{ href: "/keywords", label: "Run a keyword check" }}
    >
      {records.length === 0 ? (
        <EmptySection
          message="This app hasn't surfaced in any of your saved keyword checks."
          hint="Run keyword checks to track where your app ranks across queries that matter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((r) => {
            const ranked = (r.snapshot?.apps ?? []).find(
              (a) => normalizeStoreUrl(a.url) === appKey
            );
            const country = r.country ?? "us";
            const lang = r.lang ?? "en";
            const store = r.store ?? "both";
            const limit = r.limit ?? 10;
            return (
              <Link
                key={r.id}
                href={`/keywords?keyword=${encodeURIComponent(r.keyword ?? "")}&country=${country}&lang=${lang}&store=${store}&limit=${limit}`}
                className="card-soft p-4 hover:border-accent/40 transition-colors block"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[14px] font-semibold text-ink truncate">
                    &ldquo;{r.keyword ?? "—"}&rdquo;
                  </p>
                  {ranked && (
                    <span
                      className={`text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                        ranked.rank <= 3
                          ? "bg-green/10 text-green"
                          : ranked.rank <= 10
                            ? "bg-accent/10 text-accent"
                            : "bg-cream-deep text-ink-muted"
                      }`}
                    >
                      #{ranked.rank}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-faint truncate">
                  {country.toUpperCase()} ·{" "}
                  {store === "both"
                    ? "Both stores"
                    : store === "play"
                      ? "Play Store"
                      : "App Store"}{" "}
                  · {relativeTime(r.createdAt)}
                </p>
                <div className="mt-2 pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>View ranking</span>
                  <ChevronRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function GenerationsSection({ records }: { records: GenerationResult[] }) {
  return (
    <Section
      icon={<Wand2 size={14} />}
      label="Generated listings"
      count={records.length}
      cta={{ href: "/generator", label: "Generate a new listing" }}
    >
      {records.length === 0 ? (
        <EmptySection
          message="No generated listings yet for this app."
          hint="Run the ASO Generator to draft a keyword-optimised listing tailored to this app."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((g) => {
            const variant = g.android?.[0] ?? g.ios?.[0];
            const platforms: string[] = [];
            if (g.android) platforms.push("Play");
            if (g.ios) platforms.push("App Store");
            return (
              <Link
                key={g.id}
                href={`/history#${g.id}`}
                className="card-soft p-4 hover:border-accent/40 transition-colors block"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-faint">
                    {platforms.join(" + ")}
                  </span>
                  <span className="text-[11px] text-ink-faint">
                    · {relativeTime(g.createdAt)}
                  </span>
                </div>
                {variant && (
                  <>
                    <p className="text-[13px] font-semibold text-ink truncate">{variant.title}</p>
                    <p className="text-[11px] text-ink-muted truncate mt-0.5">
                      {variant.shortDesc ?? variant.subtitle ?? ""}
                    </p>
                  </>
                )}
                <div className="mt-2 pt-2 border-t border-line-soft flex items-center justify-between text-[11px] text-ink-faint">
                  <span>View in history</span>
                  <ChevronRight size={11} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function Section({
  icon,
  label,
  count,
  cta,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  cta?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl tile-blue flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-ink leading-tight">{label}</h2>
            <p className="text-[11px] text-ink-faint">
              {count} {count === 1 ? "record" : "records"}
            </p>
          </div>
        </div>
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            {cta.label}
            <ChevronRight size={12} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptySection({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="card-soft p-6 text-center">
      <p className="text-[13px] text-ink mb-1">{message}</p>
      <p className="text-[12px] text-ink-faint">{hint}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY: AppEntry (Library) detail — preserved for back-compat with old
// /library and /dashboard links pointing at /apps/{appEntryId}.
// ═══════════════════════════════════════════════════════════════════════════

function LegacyAppEntryDetail({ app }: { app: AppEntry }) {
  const platforms = new Set<string>();
  app.generations.forEach((g) => {
    if (g.android) platforms.add("Android");
    if (g.ios) platforms.add("iOS");
  });

  const lastEdit =
    app.generations.length > 0
      ? new Date(app.generations[app.generations.length - 1].createdAt).toLocaleDateString()
      : "Never";

  const stats = [
    { icon: Wand2, label: "Generations", value: app.generations.length, tile: "tile-blue" },
    {
      icon: Smartphone,
      label: "Platforms",
      value: [...platforms].join(", ") || "None",
      tile: "tile-lilac",
    },
    { icon: Clock, label: "Last edit", value: lastEdit, tile: "tile-mint" },
  ];

  return (
    <AppShell
      eyebrow={`Workspace · ${app.category}`}
      title={app.name}
      description={`Every variant, brief, and score you've recorded for ${app.name}.`}
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
      <div className="card-soft p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl shrink-0" style={{ background: app.icon }} />
        <div>
          <p className="eyebrow">{app.category}</p>
          <p className="text-[18px] font-semibold text-ink mt-1">{app.name}</p>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {app.generations.length} generation{app.generations.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="card-soft p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`w-11 h-11 rounded-xl ${stat.tile} inline-flex items-center justify-center mb-4`}
              >
                <Icon size={18} strokeWidth={1.85} />
              </div>
              <p
                className="text-[22px] font-semibold tracking-[-0.01em]"
                style={{ color: "#0B3D7A" }}
              >
                {stat.value}
              </p>
              <p className="text-[12px] text-ink-muted mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <h2
        className="text-[22px] font-semibold tracking-[-0.01em] mb-5"
        style={{ color: "#0B3D7A" }}
      >
        Generation history
      </h2>
      {app.generations.length === 0 ? (
        <p className="text-[14px] text-ink-muted">No generations yet.</p>
      ) : (
        <div className="space-y-4">
          {app.generations.map((gen) => {
            const variants = gen.android || gen.ios || [];
            return (
              <div key={gen.id} className="card-soft p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] tile-blue">
                      {gen.android ? "Play Store" : "App Store"}
                    </span>
                    <span className="text-[12px] text-ink-faint">
                      {new Date(gen.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[12px] text-ink-faint capitalize">{gen.input.tone}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {variants.map((v) => (
                    <div key={v.id} className="p-4 rounded-xl bg-cream-deep">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] tile-blue">
                        {v.label}
                      </span>
                      <p className="text-[13px] font-semibold text-ink mt-2.5 line-clamp-2 leading-snug">
                        {v.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
