export function MockRedditReply() {
  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-line-soft">
        <span className="font-mono text-xs text-ink-faint">Reddit Replies</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="p-3 rounded-xl bg-paper border border-line-soft">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-accent/20" />
            <span className="text-xs font-medium text-ink-muted">r/androidapps</span>
            <span className="text-xs text-ink-faint">&middot; 2h</span>
          </div>
          <p className="text-sm font-semibold text-ink">
            Looking for a good productivity app
          </p>
          <p className="text-xs text-ink-muted mt-1">
            Anyone know a good task manager that doesn&apos;t try to be everything?
          </p>
        </div>
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20">
          <p className="text-xs text-ink-muted mb-1 font-mono">Draft reply</p>
          <p className="text-sm text-ink">
            Check out FocusFlow &mdash; it&apos;s just tasks and a focus timer, nothing
            else. Been using it for a month...
          </p>
        </div>
      </div>
    </div>
  );
}
