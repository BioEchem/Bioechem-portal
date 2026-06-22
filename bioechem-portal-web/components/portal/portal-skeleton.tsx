export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-bio-text-muted/10 ${className}`} />
  );
}

export function SkeletonCard({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)] ${className}`}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonLine
            key={i}
            className={`h-4 ${i === 0 ? "w-1/3" : i % 2 === 0 ? "w-full" : "w-4/5"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PortalPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="flex-1 overflow-y-auto bg-bio-mint/30 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="mt-2 h-4 w-64" />
        </header>
        <div className="space-y-4">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} rows={i === 0 ? 2 : 4} />
          ))}
        </div>
      </div>
    </div>
  );
}
