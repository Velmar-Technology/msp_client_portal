import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/Page";

interface TablePageSkeletonProps {
  rows?: number;
  showFilters?: boolean;
}

export function TablePageSkeleton({ rows = 6, showFilters = true }: TablePageSkeletonProps) {
  return (
    <Page>
      <div className="space-y-6 animate-fade-in" aria-label="Loading table content">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>

        {/* Filter & Search Bar */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3.5 shadow-xs">
            <Skeleton className="h-8 w-full sm:w-72 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        )}

        {/* Table Skeleton */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
