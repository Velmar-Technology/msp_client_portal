import { queryClient } from "@/lib/queryClient";
import { ticketQueryOptions } from "@/features/tickets";
import { billingQueryOptions } from "@/features/billing";
import { subscriptionQueryOptions } from "@/features/subscriptions";
import { equipmentQueryOptions } from "@/features/equipment";

/**
 * Route chunk preloader map.
 */
export const routeChunkPreloaders: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/features/dashboard"),
  "/financial": () => import("@/features/financial"),
  "/crm": () => import("@/features/crm"),
  "/plans": () => import("@/features/subscriptions"),
  "/billing": () => import("@/features/billing"),
  "/devices": () => import("@/features/equipment"),
  "/rmm": () => import("@/features/equipment"),
  "/resources": () => import("@/features/equipment"),
  "/maintenance": () => import("@/features/rmm"),
  "/tech/dashboard": () => import("@/features/dashboard"),
  "/admin/users": () => import("@/features/users"),
  "/admin/api-status": () => import("@/features/system"),
  "/tickets": () => import("@/features/tickets"),
  "/profile": () => import("@/features/settings"),
  "/notifications/preferences": () => import("@/features/settings"),
  "/help": () => import("@/features/settings"),
  "/password-manager": () => import("@/features/settings"),
};

export const routePreloaders = routeChunkPreloaders;

/**
 * Route query cache preloader map.
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
export function preloadRoute(path: string): void {
  const cleanPath = path.split("?")[0];

  // 1. Prefetch JavaScript chunk
  const chunkLoader = routeChunkPreloaders[cleanPath];
  if (chunkLoader) {
    chunkLoader().catch(() => {});
  }

  // 2. Prefetch TanStack Query cache
  const queryLoader = routeQueryPreloaders[cleanPath];
  if (queryLoader) {
    queryLoader().catch(() => {});
  }
}
