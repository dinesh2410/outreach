"use client";

import { useState } from "react";
import { GeneratorInput, Category, Platform } from "@/lib/types";
import { CATEGORY_LIST, CATEGORY_THEMES } from "@/lib/constants";
import {
  Zap, Brain, Code, Gamepad2, Users, Heart, Wallet, Activity, Grid3X3,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Zap, Brain, Code, Gamepad2, Users, Heart, Wallet, Activity, Grid3X3,
};

const TONES = [
  { value: "professional" as const, label: "Professional" },
  { value: "casual" as const, label: "Casual" },
  { value: "playful" as const, label: "Playful" },
  { value: "minimal" as const, label: "Minimal" },
];

export function GeneratorInputForm({
  onGenerate,
}: {
  onGenerate: (input: GeneratorInput) => void;
}) {
  const [platform, setPlatform] = useState<Platform[]>(["android"]);
  const [appName, setAppName] = useState("");
  const [category, setCategory] = useState<Category>("Productivity");
  const [features, setFeatures] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<GeneratorInput["tone"]>("professional");
  const [storeUrl, setStoreUrl] = useState("");

  function togglePlatform(p: Platform) {
    setPlatform((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  }

  function useExample() {
    const theme = CATEGORY_THEMES[category];
    setFeatures(theme.exampleFeatures);
    setAudience(theme.exampleAudience);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appName.trim() || !features.trim()) return;
    onGenerate({
      platform,
      appName: appName.trim(),
      category,
      features: features.trim(),
      audience: audience.trim() || undefined,
      tone,
      storeUrl: storeUrl.trim() || undefined,
    });
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <h1 className="text-3xl font-semibold text-ink mb-2">
        Generate descriptions
      </h1>
      <p className="text-ink-muted mb-8">
        Tell us about your app and we&apos;ll generate three ASO-optimized variants.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Platform</label>
          <div className="flex gap-2">
            {(["android", "ios"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  platform.includes(p)
                    ? "bg-accent text-white border-accent"
                    : "bg-surface text-ink-muted border-line hover:border-ink-faint"
                }`}
              >
                {p === "android" ? "Android" : "iOS"}
              </button>
            ))}
          </div>
        </div>

        {/* App name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">App name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            required
            placeholder="e.g. FocusFlow"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_LIST.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Grid3X3;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    category === cat.value
                      ? "bg-accent/10 text-accent border-accent/30 font-medium"
                      : "bg-surface text-ink-muted border-line hover:border-ink-faint"
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">Key features</label>
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
            onChange={(e) => setFeatures(e.target.value)}
            required
            rows={3}
            placeholder="List your app's main features, separated by commas"
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm resize-none"
          />
        </div>

        {/* Audience */}
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

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Tone</label>
          <div className="flex gap-2">
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

        {/* Store URL */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Store URL <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors"
        >
          Generate three variants
        </button>
      </form>
    </div>
  );
}
