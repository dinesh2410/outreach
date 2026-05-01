const CATEGORIES = [
  "Productivity",
  "AI Tools",
  "Health",
  "Finance",
  "Games",
  "Lifestyle",
];

export function TrustedBy() {
  return (
    <section className="border-y border-line-soft">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center text-xs text-ink-faint uppercase tracking-[0.2em] mb-6">
          Trusted across categories
        </p>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
          {CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="text-base font-medium text-ink-faint select-none"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
