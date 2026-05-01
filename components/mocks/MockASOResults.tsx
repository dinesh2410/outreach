export function MockASOResults({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`bg-surface rounded-2xl border border-line shadow-sm overflow-hidden ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <div className="px-4 py-3 border-b border-line-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-gold" />
          <span className="font-semibold text-ink">FocusFlow</span>
        </div>
        <span className="font-mono text-ink-faint text-xs">Productivity</span>
      </div>
      <div className="p-4 space-y-3">
        {[
          { label: "A", tag: "Keyword", color: "bg-accent/10 text-accent" },
          { label: "B", tag: "Conversion", color: "bg-gold/10 text-gold" },
          { label: "C", tag: "Brand", color: "bg-green/10 text-green" },
        ].map((v) => (
          <div
            key={v.label}
            className="flex items-start gap-3 p-3 rounded-xl bg-paper border border-line-soft"
          >
            <div
              className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${v.color}`}
            >
              {v.label}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate">
                FocusFlow &mdash; {v.tag} Title
              </p>
              <p className="text-ink-muted truncate mt-0.5">
                {v.tag === "Keyword"
                  ? "Productivity focus app for professionals and creators"
                  : v.tag === "Conversion"
                    ? "Most productivity apps slow you down..."
                    : "Focus. Done differently."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
