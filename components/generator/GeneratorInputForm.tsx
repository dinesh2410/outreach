"use client";

import { useState } from "react";
import { GeneratorInput, Category, Platform } from "@/lib/types";
import { CATEGORY_LIST, CATEGORY_THEMES } from "@/lib/constants";
import {
  Zap, Brain, Code, Gamepad2, Users, Heart, Wallet, Activity, Grid3X3,
  ArrowRight, ArrowLeft, Link2, PenLine, Smartphone, Loader2, AlertCircle,
} from "@/components/shared/Icon";
import categoryExamples from "@/data/category-examples.json";
import { useAuth } from "@/lib/auth";
import { AppPicker } from "@/components/shared/AppPicker";
import type { MyApp } from "@/lib/types";

type CategoryExample = { name: string; icon: string };
const CATEGORY_EXAMPLES = categoryExamples as Record<string, CategoryExample[]>;

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Zap, Brain, Code, Gamepad2, Users, Heart, Wallet, Activity, Grid3X3,
};

const TONES = [
  { value: "professional" as const, label: "Professional" },
  { value: "casual" as const, label: "Casual" },
  { value: "playful" as const, label: "Playful" },
  { value: "minimal" as const, label: "Minimal" },
];

type Step = "platform" | "method" | "url" | "details";
type Method = "url" | "manual" | "saved";

interface ScrapeResponse {
  source: "play" | "ios";
  title?: string;
  shortDesc?: string;
  subtitle?: string;
  fullDesc?: string;
  genre?: string;
  developer?: string;
  iconUrl?: string;
}

// Pull the brand name out of a scraped title like "Notewise: AI Notes" → "Notewise".
function extractAppName(title: string | undefined): string {
  if (!title) return "";
  const trimmed = title.trim();
  const splitIdx = Math.min(
    ...[":", " - ", " – ", " — ", "|"]
      .map((sep) => {
        const idx = trimmed.indexOf(sep);
        return idx === -1 ? Infinity : idx;
      })
  );
  if (Number.isFinite(splitIdx)) return trimmed.slice(0, splitIdx).trim();
  return trimmed;
}

// Hand the developer the full scraped description verbatim, so no detail
// from the live listing gets dropped. They can trim it down in the textarea
// if they want. Falls back to shortDesc only when fullDesc is missing.
function extractFeatures(shortDesc: string | undefined, fullDesc: string | undefined): string {
  if (fullDesc && fullDesc.trim().length > 0) return fullDesc.trim();
  if (shortDesc) return shortDesc.trim();
  return "";
}

// Best-effort map from a scraped store genre to our internal Category enum.
function mapGenreToCategory(genre: string | undefined): Category {
  if (!genre) return "Other";
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

export function GeneratorInputForm({
  onGenerate,
}: {
  onGenerate: (input: GeneratorInput) => void;
}) {
  const { myApps } = useAuth();
  const [step, setStep] = useState<Step>("platform");
  const [platform, setPlatform] = useState<Platform>("android");
  const [method, setMethod] = useState<Method | null>(null);

  // Details — shared across both branches, prefilled if URL was scraped.
  const [appName, setAppName] = useState("");
  const [category, setCategory] = useState<Category>("Productivity");
  const [features, setFeatures] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<GeneratorInput["tone"]>("professional");
  const [storeUrl, setStoreUrl] = useState("");

  // URL step state.
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Validation on the final step.
  const [showFeaturesError, setShowFeaturesError] = useState(false);

  function pickPlatform(p: Platform) {
    setPlatform(p);
    setStep("method");
  }

  function pickMethod(m: Method) {
    setMethod(m);
    if (m === "url") {
      setStep("url");
    } else {
      // Manual or saved — both jump to details (saved is prefilled by handleSelectSaved).
      setStep("details");
    }
  }

  function handleSelectSaved(app: MyApp) {
    setAppName(app.name);
    setFeatures(app.fullDesc?.trim() ?? app.shortDesc?.trim() ?? "");
    setAudience("");
    setCategory(app.category ?? "Other");
    setStoreUrl(app.url);
    setMethod("saved");
    setStep("details");
  }

  async function handleScrape() {
    if (!storeUrl.trim()) return;
    setScrapeError(null);
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: storeUrl.trim() }),
      });
      const data: ScrapeResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setScrapeError(data.error ?? "Could not scrape this listing.");
        return;
      }
      setAppName(extractAppName(data.title));
      setFeatures(extractFeatures(data.shortDesc, data.fullDesc));
      // Audience is not directly available from a listing — leave empty for the user.
      setAudience("");
      setCategory(mapGenreToCategory(data.genre));
      setStep("details");
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Network error while scraping.");
    } finally {
      setScraping(false);
    }
  }

  function useExample() {
    const theme = CATEGORY_THEMES[category];
    setFeatures(theme.exampleFeatures);
    setAudience(theme.exampleAudience);
    setShowFeaturesError(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!features.trim()) {
      setShowFeaturesError(true);
      return;
    }
    onGenerate({
      platform: [platform],
      appName: appName.trim() || "Untitled",
      category,
      features: features.trim(),
      audience: audience.trim() || undefined,
      tone,
      storeUrl: method === "url" ? storeUrl.trim() || undefined : undefined,
    });
  }

  function handleBack() {
    if (step === "details" && method === "manual") setStep("method");
    else if (step === "details" && method === "saved") setStep("method");
    else if (step === "details" && method === "url") setStep("url");
    else if (step === "url") setStep("method");
    else if (step === "method") setStep("platform");
  }

  // ── STEP 1: Platform ─────────────────────────────────────────────────────
  if (step === "platform") {
    return (
      <div className="max-w-2xl mx-auto animate-fade-up">
        <FlowHeader
          stepLabel="Step 1 of 3"
          title="Which store are you writing for?"
          description="Different stores, different rules. Pick one — you can run again for the other."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PlatformCard
            icon={<Smartphone size={24} />}
            label="Google Play"
            sublabel="Android"
            active={platform === "android"}
            onClick={() => pickPlatform("android")}
          />
          <PlatformCard
            icon={<Smartphone size={24} />}
            label="App Store"
            sublabel="iOS"
            active={platform === "ios"}
            onClick={() => pickPlatform("ios")}
          />
        </div>
      </div>
    );
  }

  // ── STEP 2: Method ───────────────────────────────────────────────────────
  if (step === "method") {
    return (
      <div className="max-w-2xl mx-auto animate-fade-up">
        <FlowHeader
          stepLabel="Step 2 of 3"
          title="How should we set this up?"
          description={
            platform === "android"
              ? "Paste your Play Store URL and we'll pull the basics, or enter them yourself."
              : "Paste your App Store URL and we'll pull the basics, or enter them yourself."
          }
          onBack={handleBack}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MethodCard
            icon={<Link2 size={20} />}
            label="I have a store URL"
            sublabel="We scrape the basics, you edit"
            onClick={() => pickMethod("url")}
          />
          <MethodCard
            icon={<PenLine size={20} />}
            label="Enter manually"
            sublabel="Fill in app name and features"
            onClick={() => pickMethod("manual")}
          />
        </div>

        {myApps.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-[12px] text-ink-muted">
            <span className="h-px flex-1 bg-line-soft" />
            <span>or use one you&apos;ve saved</span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>
        )}

        {myApps.length > 0 && (
          <div className="mt-4 flex justify-center">
            <AppPicker onSelect={handleSelectSaved} buttonLabel="Pick from your apps" />
          </div>
        )}
      </div>
    );
  }

  // ── STEP 3a: URL ─────────────────────────────────────────────────────────
  if (step === "url") {
    return (
      <div className="max-w-2xl mx-auto animate-fade-up">
        <FlowHeader
          stepLabel="Step 3 of 3"
          title="Paste your store URL"
          description={
            platform === "android"
              ? "Looks like: https://play.google.com/store/apps/details?id=..."
              : "Looks like: https://apps.apple.com/us/app/.../id..."
          }
          onBack={handleBack}
        />
        <div className="space-y-3">
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => {
              setStoreUrl(e.target.value);
              if (scrapeError) setScrapeError(null);
            }}
            autoFocus
            placeholder={
              platform === "android"
                ? "https://play.google.com/store/apps/details?id=com.example.app"
                : "https://apps.apple.com/us/app/example/id1234567890"
            }
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
          />
          {scrapeError && (
            <div className="flex items-start gap-2 text-xs text-warn p-3 rounded-xl bg-warn/5 border border-warn/30">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p>{scrapeError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("manual");
                    setStep("details");
                  }}
                  className="mt-1 underline hover:no-underline"
                >
                  Enter details manually instead
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleScrape}
            disabled={!storeUrl.trim() || scraping}
            className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {scraping ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Pulling listing…
              </>
            ) : (
              <>
                Pull and continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 3b/4: Details ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <FlowHeader
        stepLabel="Step 3 of 3"
        title={
          method === "url"
            ? "Review what we pulled"
            : method === "saved"
              ? "Review your app details"
              : "Tell us about your app"
        }
        description={
          method === "url"
            ? "We pre-filled what we could from your listing. Edit anything that's off."
            : method === "saved"
              ? "Pre-filled from your saved app. Edit anything before generating."
              : "Fill in the details below. Key features is required — everything else is optional but helps."
        }
        onBack={handleBack}
        rightSlot={
          myApps.length > 0 ? (
            <AppPicker onSelect={handleSelectSaved} buttonLabel="Swap app" align="right" />
          ) : null
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* App name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">App name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. FocusFlow"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Key features — REQUIRED */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink inline-flex items-center gap-1">
              Key features
              <span className="text-warn" aria-label="required">*</span>
            </label>
            <button
              type="button"
              onClick={useExample}
              className="text-xs text-accent hover:underline"
            >
              Use example for {category}
            </button>
          </div>
          <textarea
            value={features}
            onChange={(e) => {
              setFeatures(e.target.value);
              if (showFeaturesError && e.target.value.trim()) setShowFeaturesError(false);
            }}
            required
            rows={method === "url" ? 10 : 4}
            placeholder="List your app's main features, separated by commas"
            className={`w-full px-4 py-3 rounded-xl bg-surface border text-ink placeholder:text-ink-faint focus:outline-none text-sm resize-y ${
              showFeaturesError
                ? "border-warn focus:border-warn"
                : "border-line focus:border-accent"
            }`}
          />
          {showFeaturesError && (
            <p className="mt-1 text-xs text-warn inline-flex items-center gap-1">
              <AlertCircle size={12} />
              Key features is required.
            </p>
          )}
        </div>

        {/* Target audience */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Target audience <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. Remote workers and freelancers"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Category <span className="text-ink-faint text-xs">(hover to see example apps)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_LIST.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Grid3X3;
              const examples = CATEGORY_EXAMPLES[cat.value] ?? [];
              return (
                <CategoryButton
                  key={cat.value}
                  active={category === cat.value}
                  onClick={() => setCategory(cat.value)}
                  icon={<Icon size={16} />}
                  label={cat.label}
                  examples={examples}
                />
              );
            })}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Tone</label>
          <div className="flex gap-2 flex-wrap">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                  tone === t.value
                    ? "bg-accent text-white border-accent"
                    : "bg-surface text-ink-muted border-line hover:border-ink-faint"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors inline-flex items-center justify-center gap-2"
        >
          Generate ASO-optimized listing
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function FlowHeader({
  stepLabel,
  title,
  description,
  onBack,
  rightSlot,
}: {
  stepLabel: string;
  title: string;
  description: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}
          <span className="text-xs font-medium text-accent uppercase tracking-wide">{stepLabel}</span>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
      <h1 className="text-3xl font-semibold text-ink mb-2">{title}</h1>
      <p className="text-ink-muted">{description}</p>
    </div>
  );
}

function PlatformCard({
  icon,
  label,
  sublabel,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all hover:border-accent hover:shadow-sm ${
        active ? "border-accent bg-accent/5" : "border-line bg-surface"
      }`}
    >
      <div
        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          active ? "bg-accent text-white" : "bg-cream text-ink-muted group-hover:text-accent"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted mt-0.5">{sublabel}</p>
      </div>
      <ArrowRight size={16} className="text-ink-faint group-hover:text-accent shrink-0 mt-1" />
    </button>
  );
}

function CategoryButton({
  active,
  onClick,
  icon,
  label,
  examples,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  examples: CategoryExample[];
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
          active
            ? "bg-accent/10 text-accent border-accent/30 font-medium"
            : "bg-surface text-ink-muted border-line hover:border-ink-faint"
        }`}
      >
        {icon}
        {label}
      </button>
      {examples.length > 0 && (
        <div
          className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 rounded-2xl bg-ink text-white shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
          role="tooltip"
        >
          <p className="text-[11px] font-medium text-white/60 mb-2 uppercase tracking-wide">
            Apps like
          </p>
          <ul className="space-y-1.5">
            {examples.map((ex) => (
              <li key={ex.name} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ex.icon}
                  alt={ex.name}
                  className="w-6 h-6 rounded-md shrink-0 bg-white/10"
                  loading="lazy"
                />
                <span className="text-xs text-white/90">{ex.name}</span>
              </li>
            ))}
          </ul>
          {/* Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-ink rotate-45" />
        </div>
      )}
    </div>
  );
}

function MethodCard({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 p-5 rounded-2xl border-2 border-line bg-surface text-left transition-all hover:border-accent hover:shadow-sm"
    >
      <div className="shrink-0 w-10 h-10 rounded-xl bg-cream text-ink-muted flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted mt-0.5">{sublabel}</p>
      </div>
      <ArrowRight size={16} className="text-ink-faint group-hover:text-accent shrink-0 mt-1" />
    </button>
  );
}
