export function Skeleton({ className = '' }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink/[0.06] ${className}`} />
  );
}

/** Placeholder shown while a panel loads for the first time. */
export function PanelSkeleton({ className = '', lines = 4 }) {
  return (
    <div
      className={`rounded-panel border border-rule bg-surface p-6 ${className}`}
      aria-busy="true"
    >
      <Skeleton className="h-5 w-40" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
