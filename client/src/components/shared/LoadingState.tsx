import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
  type?: 'table' | 'cards' | 'form';
}

export function LoadingState({ rows = 5, columns = 4, className, type = 'table' }: LoadingStateProps) {
  if (type === 'cards') {
    return (
      <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-md p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {/* Table header */}
      <div className="flex gap-3 px-3 py-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${100 / columns}%` }} />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 px-3 py-3 border-b">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-3"
              style={{ width: `${(100 / columns) * (j === 0 ? 1.5 : 1)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
