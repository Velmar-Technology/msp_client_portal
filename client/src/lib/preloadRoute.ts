import { queryClient } from "@/lib/queryClient";
import { ticketQueryOptions } from "@/features/tickets";
import { billingQueryOptions } from "@/features/billing";
import { subscriptionQueryOptions } from "@/features/subscriptions";
import { equipmentQueryOptions } from "@/features/equipment";

/**
 * Route query cache preloader map. Feature route chunks are code-split via
 * dynamic import() inside each feature's routes.tsx, so only TanStack Query
 * caches are prefetched here (they import lightweight, already-bundled
 * queryOptions from the feature gateways).
 */
export const routeQueryPreloaders: Record<string, () => Promise<unknown>> = {
  "/tickets": () => queryClient.prefetchQuery(ticketQueryOptions.list({})),
  "/billing": () => queryClient.prefetchQuery(billingQueryOptions.invoiceList({ page: 1, limit: 10 })),
  "/plans": () => queryClient.prefetchQuery(subscriptionQueryOptions.plans()),
  "/devices": () => queryClient.prefetchQuery(equipmentQueryOptions.myDevices()),
};

/**
 * SOTA Intent Preloader (ADR-003):
 * Prefetches both JavaScript code chunk and TanStack Query server cache upon user hover/focus intent.
 */
/**
 * Route preloader dispatch alias (backend/frontend feature chunk prefetch is
 * implicit via code-splitting; hover/focus intent triggers dataset prefetch).
 */
export const routePreloaders = routeQueryPreloaders;

export function preloadRoute(path: string): void {
  const cleanPath = path.split("?")[0];

  // Prefetch TanStack Query cache
  const queryLoader = routeQueryPreloaders[cleanPath];
  if (queryLoader) {
    queryLoader().catch(() => {});
  }
}
