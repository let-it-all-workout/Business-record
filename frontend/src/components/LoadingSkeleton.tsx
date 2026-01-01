
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({ className = '', width = '100%', height = '1rem', rounded = true }: SkeletonProps) {
  return (
    <div
      className={`bg-slate-200 animate-pulse ${rounded ? 'rounded' : ''} ${className}`}
      style={{ width, height }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} width="25%" height="1.5rem" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} width="25%" height="1rem" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-6">
      <Skeleton width="60%" height="1.5rem" className="mb-4" />
      <Skeleton width="100%" height="2rem" className="mb-2" />
      <Skeleton width="80%" height="1rem" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-6">
      <Skeleton width="40%" height="1.5rem" className="mb-6" />
      <div className="h-64 flex items-end justify-between gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton
            key={i}
            width="8%"
            height={`${Math.random() * 60 + 20}%`}
            rounded={false}
            className="rounded-t"
          />
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton width="50%" height="0.875rem" className="mb-2" />
      <Skeleton width="70%" height="2rem" className="mb-2" />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  );
}

