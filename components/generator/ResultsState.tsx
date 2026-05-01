"use client";

import { useState } from "react";
import { GenerationResult, Variant, Platform } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { extractKeywords } from "@/lib/keywords";
import { Copy, Download, Save, RotateCcw, Check } from "lucide-react";

export function ResultsState({
  result,
  onReset,
}: {
  result: GenerationResult;
  onReset: () => void;
}) {
  const hasBoth = !!(result.android && result.ios);
  const [activePlatform, setActivePlatform] = useState<Platform>(
    result.android ? "android" : "ios"
  );
  const variants =
    activePlatform === "android" ? result.android! : result.ios!;

  const [activeVariant, setActiveVariant] = useState(0);
  const [view, setView] = useState<"edit" | "compare">("edit");
  const [editedVariants, setEditedVariants] = useState<Variant[]>(variants);

  const { saveGeneration } = useAuth();
  const { push } = useToast();

  const current = editedVariants[activeVariant];
  const allText = editedVariants.map((v) => `${v.title} ${v.shortDesc || v.subtitle || ""} ${v.fullDesc}`).join(" ");
  const keywords = extractKeywords(allText);

  function updateField(field: keyof Variant, value: string) {
    setEditedVariants((prev) =>
      prev.map((v, i) =>
        i === activeVariant ? { ...v, [field]: value } : v
      )
    );
  }

  function copyField(text: string) {
    navigator.clipboard.writeText(text);
    push("Copied to clipboard", "success");
  }

  function copyAll() {
    const v = current;
    const text = [
      `Title: ${v.title}`,
      v.shortDesc ? `Short Description: ${v.shortDesc}` : `Subtitle: ${v.subtitle}`,
      `Full Description:\n${v.fullDesc}`,
    ].join("\n\n");
    navigator.clipboard.writeText(text);
    push("All fields copied", "success");
  }

  function exportTxt() {
    const v = current;
    const text = [
      `Title: ${v.title}`,
      v.shortDesc ? `Short Description: ${v.shortDesc}` : `Subtitle: ${v.subtitle}`,
      `Full Description:\n${v.fullDesc}`,
    ].join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.input.appName}-${current.label}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    push("Exported as .txt", "success");
  }

  function handleSave() {
    saveGeneration(result);
    push("Saved to library", "success");
  }

  const charColor = (current: number, max: number) => {
    const pct = current / max;
    return pct > 0.9 ? "text-accent" : pct > 0.7 ? "text-gold" : "text-green";
  };

  return (
    <div className="animate-fade-up">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">
            {result.input.appName}
          </h1>
          {hasBoth && (
            <div className="flex gap-1 bg-surface rounded-xl border border-line p-1">
              {(["android", "ios"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setActivePlatform(p);
                    setEditedVariants(
                      p === "android" ? result.android! : result.ios!
                    );
                    setActiveVariant(0);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activePlatform === p
                      ? "bg-accent text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {p === "android" ? "Play Store" : "App Store"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-xl text-sm font-medium text-ink hover:border-ink-faint transition-colors"
          >
            <Save size={14} />
            Save to library
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-xl text-sm font-medium text-ink-muted hover:border-ink-faint transition-colors"
          >
            <RotateCcw size={14} />
            New
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-surface rounded-xl border border-line p-1 w-fit mb-6">
        <button
          onClick={() => setView("edit")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "edit" ? "bg-accent text-white" : "text-ink-muted"
          }`}
        >
          Edit one
        </button>
        <button
          onClick={() => setView("compare")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === "compare" ? "bg-accent text-white" : "text-ink-muted"
          }`}
        >
          Compare all
        </button>
      </div>

      {view === "edit" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left rail — variant cards */}
          <div className="lg:col-span-3 space-y-2">
            {editedVariants.map((v, i) => {
              const colors =
                v.approach === "keyword"
                  ? "border-accent/30 bg-accent/5"
                  : v.approach === "conversion"
                    ? "border-gold/30 bg-gold/5"
                    : "border-green/30 bg-green/5";
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveVariant(i)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
                    i === activeVariant ? colors : "border-line bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        v.approach === "keyword"
                          ? "bg-accent/10 text-accent"
                          : v.approach === "conversion"
                            ? "bg-gold/10 text-gold"
                            : "bg-green/10 text-green"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">
                      {v.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink truncate">
                    {v.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right pane — editor */}
          <div className="lg:col-span-9">
            <div className="bg-surface rounded-3xl border border-line p-6 space-y-5">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink-muted">Title</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${charColor(current.title.length, 30)}`}>
                      {current.title.length}/30
                    </span>
                    <button onClick={() => copyField(current.title)} className="text-ink-faint hover:text-ink">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={current.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-xl bg-cream border border-line text-ink font-semibold focus:outline-none focus:border-accent text-sm"
                />
              </div>

              {/* Short desc / subtitle */}
              {activePlatform === "android" ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-ink-muted">Short description</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${charColor((current.shortDesc || "").length, 80)}`}>
                        {(current.shortDesc || "").length}/80
                      </span>
                      <button onClick={() => copyField(current.shortDesc || "")} className="text-ink-faint hover:text-ink">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={current.shortDesc || ""}
                    onChange={(e) => updateField("shortDesc", e.target.value)}
                    maxLength={80}
                    className="w-full px-4 py-3 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-ink-muted">Subtitle</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${charColor((current.subtitle || "").length, 30)}`}>
                        {(current.subtitle || "").length}/30
                      </span>
                      <button onClick={() => copyField(current.subtitle || "")} className="text-ink-faint hover:text-ink">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={current.subtitle || ""}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    maxLength={30}
                    className="w-full px-4 py-3 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              )}

              {/* Full description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-ink-muted">Full description</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${charColor(current.fullDesc.length, 4000)}`}>
                      {current.fullDesc.length}/4000
                    </span>
                    <button onClick={() => copyField(current.fullDesc)} className="text-ink-faint hover:text-ink">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <textarea
                  value={current.fullDesc}
                  onChange={(e) => updateField("fullDesc", e.target.value)}
                  maxLength={4000}
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={exportTxt}
                  className="flex items-center gap-2 px-4 py-2 bg-cream border border-line rounded-xl text-sm font-medium text-ink hover:border-ink-faint transition-colors"
                >
                  <Download size={14} />
                  Export .txt
                </button>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-deep transition-colors"
                >
                  <Copy size={14} />
                  Copy all
                </button>
              </div>
            </div>

            {/* Keyword extraction */}
            <div className="mt-6 bg-surface rounded-3xl border border-line p-6">
              <h3 className="text-sm font-semibold text-ink mb-4">
                Keyword extraction
              </h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw.word}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper border border-line-soft text-sm"
                  >
                    <span className="text-ink">{kw.word}</span>
                    <span className="text-xs font-mono text-ink-faint">
                      {kw.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Compare all view */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {editedVariants.map((v, i) => {
            const borderColor =
              v.approach === "keyword"
                ? "border-accent/30"
                : v.approach === "conversion"
                  ? "border-gold/30"
                  : "border-green/30";
            return (
              <button
                key={v.id}
                onClick={() => {
                  setActiveVariant(i);
                  setView("edit");
                }}
                className={`text-left p-6 rounded-3xl bg-surface border-2 ${borderColor} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      v.approach === "keyword"
                        ? "bg-accent/10 text-accent"
                        : v.approach === "conversion"
                          ? "bg-gold/10 text-gold"
                          : "bg-green/10 text-green"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">
                    {v.label}
                  </span>
                </div>
                <p className="font-semibold text-ink mb-2">{v.title}</p>
                <p className="text-sm text-ink-muted mb-3">
                  {v.shortDesc || v.subtitle}
                </p>
                <p className="text-xs text-ink-muted line-clamp-6 leading-relaxed whitespace-pre-line">
                  {v.fullDesc}
                </p>
                <p className="mt-4 text-xs text-accent font-medium">
                  Click to edit &rarr;
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
