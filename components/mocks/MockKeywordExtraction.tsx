export function MockKeywordExtraction() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Pick your target keyword</span>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { word: "productivity", selected: true },
            { word: "focus timer", selected: false },
            { word: "task manager", selected: false },
            { word: "workflow", selected: false },
            { word: "daily planner", selected: false },
            { word: "time tracking", selected: false },
          ].map((kw) => (
            <span
              key={kw.word}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm cursor-pointer ${
                kw.selected
                  ? "bg-accent text-white font-medium"
                  : "bg-paper border border-line-soft text-ink"
              }`}
            >
              {kw.word}
            </span>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-xs text-ink-muted">
          <span>AI-suggested keywords</span>
          <span className="font-mono text-green">1 selected</span>
        </div>
      </div>
    </div>
  );
}
