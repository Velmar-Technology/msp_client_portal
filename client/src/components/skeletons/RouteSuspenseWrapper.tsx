import { Suspense, type ReactNode } from "react";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { ContentPageSkeleton } from "./ContentPageSkeleton";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";

export interface RouteSuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  delayMs?: number;
}

function DeferredFallback({
  children,
  delayMs = SKELETON_DISPLAY_DELAY_MS,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const showSkeleton = useDeferredLoading(true, delayMs);
  if (!showSkeleton) return null;
  return <>{children}</>;
}

/**
 * Pairs route trees or lazy-loaded subfeatures with an isolated ChunkErrorBoundary
 * and deferred localized skeleton fallback to eliminate CLS, avoid skeleton flashes,
 * and protect against isolated chunk failures.
 */
export function RouteSuspenseWrapper({
  children,
  fallback = <ContentPageSkeleton />,
  delayMs = SKELETON_DISPLAY_DELAY_MS,
}: RouteSuspenseWrapperProps) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<DeferredFallback delayMs={delayMs}>{fallback}</DeferredFallback>}>
        {children}
      </Suspense>
    </ChunkErrorBoundary>
  );
}
