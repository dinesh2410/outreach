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

export default function MyAppsPage() {
  const { user, loading, myApps, saveMyApp, removeMyApp } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth?next=%2Fapps");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleAdd(e: React.FormEvent) {
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
      setUrl("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error while scraping");
    } finally {
      setScraping(false);
    }
  }

  return (
    <AppShell
      eyebrow="Workspace · Your apps"
      title="Your applications"
      description="Save the apps you work on once. Reuse them across the Generator, Score Checker, Competitor Watch, and Reddit Demand instead of re-pasting URLs every time."
      actions={
        !adding ? (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Add app
          </button>
        ) : undefined
      }
    >
      {adding && (
        <form onSubmit={handleAdd} className="card-soft p-6 mb-8">
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
              onClick={() => {
                setAdding(false);
                setUrl("");
                setError(null);
              }}
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

      {myApps.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} hide={adding} />
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
              {app.source === "ios" ? "App Store" : "Play Store"}
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
