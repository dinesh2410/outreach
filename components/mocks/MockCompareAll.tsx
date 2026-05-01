export function MockCompareAll() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Compare all view</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "A \u2014 Keyword", title: "FocusFlow \u2014 Focus Tasks", color: "border-accent/30" },
            { label: "B \u2014 Conversion", title: "FocusFlow: done right", color: "border-gold/30" },
            { label: "C \u2014 Brand", title: "FocusFlow", color: "border-green/30" },
          ].map((v) => (
            <div
              key={v.label}
              className={`p-2.5 rounded-xl bg-paper border-2 ${v.color}`}
            >
              <p className="text-[10px] font-mono text-ink-faint mb-1">{v.label}</p>
              <p className="text-xs font-semibold text-ink mb-2 truncate">{v.title}</p>
              <div className="space-y-1">
                <div className="h-1.5 rounded bg-ink/8 w-full" />
                <div className="h-1.5 rounded bg-ink/8 w-4/5" />
                <div className="h-1.5 rounded bg-ink/8 w-3/5" />
                <div className="h-1.5 rounded bg-ink/8 w-full" />
                <div className="h-1.5 rounded bg-ink/8 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
