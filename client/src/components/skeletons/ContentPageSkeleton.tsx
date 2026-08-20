import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/Page";

export function ContentPageSkeleton() {
  return (
    <Page>
      <div className="space-y-6 max-w-4xl animate-fade-in" aria-label="Loading page">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Content Section 1 */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>

        {/* Content Section 2 */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs space-y-4">
          <Skeleton className="h-5 w-44" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </Page>
  );
}
