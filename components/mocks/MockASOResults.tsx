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
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: "#2563EB" }}>
            productivity
          </span>
          <span className="text-xs text-ink-faint">Target keyword</span>
        </div>
        <div className="p-3 rounded-xl bg-paper border border-line-soft">
          <p className="font-semibold text-ink">
            FocusFlow &mdash; Productivity Timer &amp; Focus
          </p>
          <p className="text-ink-muted mt-1.5 leading-relaxed">
            The productivity app for professionals and creators. Stay focused with smart timers, track your streaks, and build a routine that works.
          </p>
          <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-line-soft text-xs text-ink-faint">
            <span>4,000 / 4,000 chars</span>
            <span className="font-mono text-green">Ready to ship</span>
          </div>
        </div>
      </div>
    </div>
  );
}
