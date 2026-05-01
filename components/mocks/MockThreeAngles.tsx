export function MockThreeAngles() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Three angles, one click</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          {
            letter: "A",
            label: "Keyword-Optimized",
            desc: "Heavy on category keywords, structured for search",
            color: "bg-accent/10 text-accent border-accent/20",
          },
          {
            letter: "B",
            label: "Conversion-Focused",
            desc: "Leads with a hook, built to convince",
            color: "bg-gold/10 text-gold border-gold/20",
          },
          {
            letter: "C",
            label: "Brand-Led",
            desc: "Sparse, distinctive, atmospheric",
            color: "bg-green/10 text-green border-green/20",
          },
        ].map((v) => (
          <div
            key={v.letter}
            className={`flex items-center gap-3 p-3 rounded-xl border ${v.color}`}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
              {v.letter}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{v.label}</p>
              <p className="text-xs text-ink-muted">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
