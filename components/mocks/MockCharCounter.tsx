export function MockCharCounter() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Character limits</span>
      </div>
      <div className="p-4 space-y-3">
        {[
          { field: "Title", current: 24, max: 30, value: "FocusFlow \u2014 Task Focus" },
          { field: "Short description", current: 62, max: 80, value: "Productivity focus app for professionals and creators who ship" },
          { field: "Full description", current: 1847, max: 4000, value: "" },
        ].map((item) => {
          const pct = item.current / item.max;
          const color =
            pct > 0.9 ? "text-accent" : pct > 0.7 ? "text-gold" : "text-green";
          return (
            <div key={item.field}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-ink-muted">{item.field}</span>
                <span className={`text-xs font-mono ${color}`}>
                  {item.current}/{item.max}
                </span>
              </div>
              {item.value && (
                <div className="p-2 rounded-lg bg-paper border border-line-soft">
                  <p className="text-sm text-ink truncate">{item.value}</p>
                </div>
              )}
              <div className="mt-1 h-1 rounded-full bg-line-soft overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct > 0.9
                      ? "bg-accent"
                      : pct > 0.7
                        ? "bg-gold"
                        : "bg-green"
                  }`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
