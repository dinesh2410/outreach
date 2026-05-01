export function MockKeywords() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Keyword Research</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          { word: "productivity", vol: "12K", diff: "Med" },
          { word: "focus timer", vol: "8.2K", diff: "Low" },
          { word: "task manager", vol: "22K", diff: "High" },
          { word: "daily planner", vol: "6.5K", diff: "Low" },
        ].map((kw) => (
          <div
            key={kw.word}
            className="flex items-center justify-between p-2 rounded-lg bg-paper border border-line-soft"
          >
            <span className="text-sm font-medium text-ink">{kw.word}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-ink-muted">{kw.vol}</span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono ${
                  kw.diff === "Low"
                    ? "bg-green/10 text-green"
                    : kw.diff === "Med"
                      ? "bg-gold/10 text-gold"
                      : "bg-accent/10 text-accent"
                }`}
              >
                {kw.diff}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
