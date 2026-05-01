export function MockScreenshot() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Screenshot Generator</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {["Track your day", "Set your goals", "See results"].map((text, i) => (
            <div
              key={i}
              className="aspect-[9/16] rounded-xl bg-gradient-to-b from-cream-deep to-paper border border-line-soft flex items-end p-2"
            >
              <div className="bg-surface rounded-lg p-2 w-full">
                <div className="h-1.5 w-3/4 rounded bg-ink/10 mb-1" />
                <p className="text-[9px] font-semibold text-ink-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1">
            {["EN", "ES", "DE"].map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded-md bg-paper border border-line-soft text-[10px] font-mono text-ink-faint"
              >
                {lang}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-ink-faint">+12 languages</span>
        </div>
      </div>
    </div>
  );
}
