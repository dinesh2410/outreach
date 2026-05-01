export function MockKeywordExtraction() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Keyword extraction</span>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { word: "productivity", count: 6 },
            { word: "focus", count: 5 },
            { word: "tasks", count: 4 },
            { word: "workflow", count: 3 },
            { word: "organize", count: 3 },
            { word: "timer", count: 2 },
            { word: "planning", count: 2 },
            { word: "efficient", count: 2 },
          ].map((kw) => (
            <span
              key={kw.word}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-paper border border-line-soft text-sm"
            >
              <span className="text-ink">{kw.word}</span>
              <span className="text-xs font-mono text-ink-faint">{kw.count}</span>
            </span>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between text-xs text-ink-muted">
          <span>8 keywords extracted</span>
          <span className="font-mono text-green">Good density</span>
        </div>
      </div>
    </div>
  );
}
