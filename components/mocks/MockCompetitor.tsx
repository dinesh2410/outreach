export function MockCompetitor() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Competitor Analysis</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Your app", score: 72, color: "text-accent" },
            { name: "Competitor", score: 65, color: "text-ink-muted" },
          ].map((app) => (
            <div
              key={app.name}
              className="p-3 rounded-xl bg-paper border border-line-soft text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cream-deep to-line mx-auto mb-2" />
              <p className="text-xs font-semibold text-ink">{app.name}</p>
              <p className={`text-2xl font-bold mt-1 ${app.color}`}>{app.score}</p>
              <p className="text-[10px] text-ink-faint">ASO Score</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {["Keywords", "Readability", "Structure"].map((metric) => (
            <div key={metric} className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">{metric}</span>
              <div className="flex gap-1">
                <div className="w-16 h-1.5 rounded-full bg-accent/30" />
                <div className="w-16 h-1.5 rounded-full bg-ink-faint/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
