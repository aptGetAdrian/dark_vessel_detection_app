interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-bg-surface ${className}`}
    />
  );
}

export function StatStripSkeleton() {
  return (
    <div className="flex flex-wrap items-stretch gap-px rounded-xl border border-border-subtle bg-border-subtle overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex min-w-0 flex-1 items-center gap-3 bg-bg-panel px-4 py-3">
          <Skeleton className="size-4 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-bg-panel shadow-panel">
      <div className="flex items-center gap-2 px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="border-b border-border-subtle px-4 pb-3">
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-14 rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-[3px] w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
      <Skeleton className="mb-4 h-3 w-40" />
      <div className="flex items-end gap-2 h-[220px] pt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-bg-panel px-5 py-4 shadow-panel">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
      <Skeleton className="mb-4 h-3 w-32" />
      <div className="space-y-0">
        <div className="flex gap-4 border-b border-border-subtle pb-2 mb-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40 flex-1" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border-subtle/40 py-2">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40 flex-1" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
