"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { proxiedIcon } from "@/lib/icon-proxy";
import type { Category, MyApp } from "@/lib/types";
import {
  Plus, Loader2, AlertCircle, ExternalLink, Trash2, Smartphone, Apple, Link2, ChevronRight,
  Edit3, Storefront, ChevronDown,
} from "@/components/shared/Icon";

// Deterministic id from the app URL so the same listing can't be saved twice.
function myAppIdFor(url: string): string {
  let h = 5381;
  const norm = url.trim().toLowerCase();
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
  }
  return `app_${(h >>> 0).toString(36)}`;
}

function extractAppName(title: string | undefined): string {
  if (!title) return "";
  const trimmed = title.trim();
  const splitIdx = Math.min(
    ...[":", " - ", " – ", " — ", "|"].map((sep) => {
      const idx = trimmed.indexOf(sep);
      return idx === -1 ? Infinity : idx;
    })
  );
  if (Number.isFinite(splitIdx)) return trimmed.slice(0, splitIdx).trim();
  return trimmed;
}

function mapGenreToCategory(genre: string | undefined): Category | undefined {
  if (!genre) return undefined;
  const g = genre.toLowerCase();
  if (/productivity/.test(g)) return "Productivity";
  if (/finance|budget|money/.test(g)) return "Finance";
  if (/health|fitness|medical/.test(g)) return "Health & fitness";
  if (/social|communication|community/.test(g)) return "Social";
  if (/lifestyle|food|travel/.test(g)) return "Lifestyle";
  if (/game|puzzle|arcade|action/.test(g)) return "Game";
  if (/develop|tools|utilit/.test(g)) return "Dev tools";
  if (/\bai\b|machine learning/.test(g)) return "AI / ML";
  return "Other";
}

type AddMode = false | "choose" | "store" | "manual";

const CATEGORIES: Category[] = [
  "Productivity", "AI / ML", "Dev tools", "Game", "Social", "Lifestyle", "Finance", "Health & fitness", "Other",
];

export default function MyAppsPage() {
  const { user, loading, myApps, saveMyApp, removeMyApp } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [adding, setAdding] = useState<AddMode>(false);
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form state
  const [manualName, setManualName] = useState("");
  const [manualSource, setManualSource] = useState<"play" | "ios">("play");
  const [manualCategory, setManualCategory] = useState<Category>("Other");
  const [manualShortDesc, setManualShortDesc] = useState("");
  const [manualFullDesc, setManualFullDesc] = useState("");
  const [manualDeveloper, setManualDeveloper] = useState("");

  function resetForms() {
    setAdding(false);
    setUrl("");
    setError(null);
    setManualName("");
    setManualSource("play");
    setManualCategory("Other");
    setManualShortDesc("");
    setManualFullDesc("");
    setManualDeveloper("");
  }

  useEffect(() => {
    if (!loading && !user) router.push("/auth?next=%2Fapps");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleStoreAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || scraping) return;
    setScraping(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not pull listing");
        return;
      }
      const now = new Date().toISOString();
      const app: MyApp = {
        id: myAppIdFor(url.trim()),
        name: extractAppName(data.title) || data.title || "Unnamed app",
        source: data.source,
        url: url.trim(),
        appId: data.appId,
        iconUrl: data.iconUrl,
        developer: data.developer,
        genre: data.genre,
        category: mapGenreToCategory(data.genre),
        shortDesc: data.shortDesc,
        fullDesc: data.fullDesc,
        createdAt: now,
        updatedAt: now,
      };
      saveMyApp(app);
      push(`Saved "${app.name}"`, "success");
      resetForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error while scraping");
    } finally {
      setScraping(false);
    }
  }

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;
    const now = new Date().toISOString();
    const syntheticUrl = `manual://${manualSource}/${manualName.trim().toLowerCase().replace(/\s+/g, "-")}`;
    const app: MyApp = {
      id: myAppIdFor(syntheticUrl),
      name: manualName.trim(),
      source: manualSource,
      url: syntheticUrl,
      developer: manualDeveloper.trim() || undefined,
      category: manualCategory,
      shortDesc: manualShortDesc.trim() || undefined,
      fullDesc: manualFullDesc.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    saveMyApp(app);
    push(`Saved "${app.name}"`, "success");
    resetForms();
  }

  return (
    <AppShell
      eyebrow="Workspace · Your apps"
      title="Your applications"
      description="Save the apps you work on once. Reuse them across the Generator, Score Checker, Competitor Watch, and Reddit Demand instead of re-pasting URLs every time."
      actions={
        !adding ? (
          <button
            onClick={() => setAdding("choose")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Add app
          </button>
        ) : undefined
      }
    >
      {/* ── Method picker ── */}
      {adding === "choose" && (
        <div className="card-soft p-6 mb-8">
          <p className="eyebrow mb-4">How would you like to add your app?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setAdding("store")}
              className="flex items-start gap-4 p-5 rounded-2xl border border-line-soft bg-white hover:border-accent/40 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
                <Storefront size={18} strokeWidth={1.85} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink group-hover:text-accent transition-colors">Import from store</p>
                <p className="text-[12px] text-ink-muted mt-0.5">
                  Paste a Google Play or App Store link and we&apos;ll pull all the details automatically.
                </p>
              </div>
            </button>
            <button
              onClick={() => setAdding("manual")}
              className="flex items-start gap-4 p-5 rounded-2xl border border-line-soft bg-white hover:border-accent/40 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl tile-blue flex items-center justify-center shrink-0">
                <Edit3 size={18} strokeWidth={1.85} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-ink group-hover:text-accent transition-colors">Add manually</p>
                <p className="text-[12px] text-ink-muted mt-0.5">
                  For apps not yet published or still in development — fill in the details yourself.
                </p>
              </div>
            </button>
          </div>
          <button
            type="button"
            onClick={resetForms}
            className="mt-4 text-[13px] text-ink-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Store import form ── */}
      {adding === "store" && (
        <form onSubmit={handleStoreAdd} className="card-soft p-6 mb-8">
          <label className="eyebrow mb-3 block">Store URL</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://play.google.com/store/apps/details?id=… or https://apps.apple.com/…"
                autoFocus
                className="w-full pl-12 pr-5 py-3.5 rounded-full bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={scraping || !url.trim()}
              className="px-6 py-3.5 rounded-full bg-accent text-white text-[14px] font-medium hover:bg-accent-deep transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              {scraping ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Pulling…
                </>
              ) : (
                <>Pull and save</>
              )}
            </button>
            <button
              type="button"
              onClick={resetForms}
              className="px-4 py-3.5 rounded-full text-ink-muted text-[14px] hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-warn">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-[12px] text-ink-faint mt-3">
            We&apos;ll pull the name, icon, category, and description from the listing. You can edit anywhere it shows up.
          </p>
        </form>
      )}

      {/* ── Manual add form ── */}
      {adding === "manual" && (
        <form onSubmit={handleManualAdd} className="card-soft p-6 mb-8">
          <p className="eyebrow mb-4">App details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* App name */}
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">App name *</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="My awesome app"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
              />
            </div>

            {/* Developer */}
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Developer / company</label>
              <input
                type="text"
                value={manualDeveloper}
                onChange={(e) => setManualDeveloper(e.target.value)}
                placeholder="Acme Inc."
                className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
              />
            </div>

            {/* Platform */}
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Platform</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualSource("play")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium border transition-colors ${
                    manualSource === "play"
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-line-soft bg-white text-ink-muted hover:border-ink-faint"
                  }`}
                >
                  <Smartphone size={14} strokeWidth={1.85} />
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setManualSource("ios")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium border transition-colors ${
                    manualSource === "ios"
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-line-soft bg-white text-ink-muted hover:border-ink-faint"
                  }`}
                >
                  <Apple size={14} strokeWidth={1.85} />
                  iOS
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as Category)}
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Short description */}
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Short description</label>
            <input
              type="text"
              value={manualShortDesc}
              onChange={(e) => setManualShortDesc(e.target.value)}
              placeholder="A brief tagline or summary of what your app does"
              className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
            />
          </div>

          {/* Full description */}
          <div className="mb-5">
            <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Full description</label>
            <textarea
              value={manualFullDesc}
              onChange={(e) => setManualFullDesc(e.target.value)}
              placeholder="Describe your app's features, benefits, and what makes it unique…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!manualName.trim()}
              className="px-6 py-3 rounded-full bg-accent text-white text-[14px] font-medium hover:bg-accent-deep transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Save app
            </button>
            <button
              type="button"
              onClick={resetForms}
              className="px-4 py-3 rounded-full text-ink-muted text-[14px] hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[12px] text-ink-faint mt-3">
            You can always update these details later. Only the app name is required.
          </p>
        </form>
      )}

      {myApps.length === 0 ? (
        <EmptyState onAdd={() => setAdding("choose")} hide={!!adding} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myApps.map((app) => (
            <AppCard key={app.id} app={app} onRemove={() => removeMyApp(app.id)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function AppCard({ app, onRemove }: { app: MyApp; onRemove: () => void }) {
  const StoreIcon = app.source === "ios" ? Apple : Smartphone;
  const iconSrc = proxiedIcon(app.iconUrl);
  return (
    <div className="card-soft p-5 group relative hover:border-accent/40 transition-colors">
      <Link href={`/apps/${app.id}`} className="block">
        <div className="flex items-start gap-4 mb-4">
          {iconSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconSrc}
              alt={app.name}
              className="w-14 h-14 rounded-2xl shrink-0 bg-cream-deep object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl tile-blue flex items-center justify-center shrink-0 font-bold text-[18px]">
              {(app.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-ink truncate">{app.name}</p>
            <p className="text-[11px] text-ink-faint truncate mt-0.5 inline-flex items-center gap-1">
              <StoreIcon size={10} strokeWidth={1.85} />
              {app.url.startsWith("manual://")
                ? `${app.source === "ios" ? "iOS" : "Android"} · Manual`
                : app.source === "ios" ? "App Store" : "Play Store"}
              {app.developer ? ` · ${app.developer}` : ""}
            </p>
            {app.category && (
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-[0.1em] mt-2">
                {app.category}
              </span>
            )}
          </div>
        </div>
        {app.shortDesc && (
          <p className="text-[12px] text-ink-muted leading-snug line-clamp-3 mb-3">
            {app.shortDesc}
          </p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-line-soft">
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
            View full report
            <ChevronRight size={12} />
          </span>
        </div>
      </Link>

      <div className="absolute top-3 right-3 flex items-center gap-1">
        {!app.url.startsWith("manual://") && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Open store listing"
            title="Open store listing"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-cream-deep"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove app"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-ink-faint hover:text-warn hover:bg-warn/5"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd, hide }: { onAdd: () => void; hide: boolean }) {
  if (hide) return null;
  return (
    <div className="card-soft p-12 text-center">
      <div className="w-14 h-14 rounded-2xl tile-blue flex items-center justify-center mx-auto mb-4">
        <Smartphone size={20} strokeWidth={1.85} />
      </div>
      <h2 className="text-[18px] font-semibold text-ink mb-2">No apps saved yet</h2>
      <p className="text-[13px] text-ink-muted max-w-md mx-auto mb-6">
        Save your apps here once and they&apos;ll be one click away in every tool — no more re-pasting the same URL.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
      >
        <Plus size={15} strokeWidth={2} />
        Add your first app
      </button>
    </div>
  );
}
