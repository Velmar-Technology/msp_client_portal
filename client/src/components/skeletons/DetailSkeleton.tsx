import { Skeleton } from "@/components/ui/skeleton";
import { Page } from "@/components/Page";

export function DetailSkeleton() {
  return (
    <Page>
      <div className="space-y-6 animate-fade-in" aria-label="Loading detail view">
        {/* Header & Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="space-y-2 w-full md:w-1/2">
            <Skeleton className="h-7 w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        {/* 2-Column Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
          {/* Main Left Content */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            {/* Description Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <Skeleton className="h-4 w-28" />
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 border border-border">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>

            {/* Conversation / Activity Feed */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <Skeleton className="h-4 w-36" />
              <div className="space-y-4 pt-2">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="space-y-2 w-3/4">
                    <Skeleton className="h-3 w-28 ml-auto" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Meta Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
