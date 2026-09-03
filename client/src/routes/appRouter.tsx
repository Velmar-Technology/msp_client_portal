import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { RouteGuard } from "./routeUtils";
import { publicRoutes } from "./publicRoutes";
import { authRoutes } from "@/features/auth";
import { dashboardRoutes } from "@/features/dashboard";
import { ticketRoutes } from "@/features/tickets";
import { billingRoutes } from "@/features/billing";
import { subscriptionRoutes } from "@/features/subscriptions";
import { equipmentRoutes } from "@/features/equipment";
import { rmmRoutes } from "@/features/rmm";
import { crmRoutes } from "@/features/crm";
import { financialRoutes } from "@/features/financial";
import { usersRoutes } from "@/features/users";
import { settingsRoutes } from "@/features/settings";
import { systemRoutes } from "@/features/system";
import type { AppRouteObject } from "./types";

const NotFoundPage = lazyWithRetry(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

/**
 * Recursively attaches RouteGuard to protected feature route items.
 */
function applyGuards(routes: AppRouteObject[]): RouteObject[] {
  return routes.map((route) => {
    const handle = route.handle;
    const isPublic = handle?.isPublic || route.path === "/dev/style-guide";

    let element = route.element;
    if (element && !isPublic) {
      element = (
        <RouteGuard
          allowedRoles={handle?.allowedRoles}
          requiredFeature={handle?.requiredFeature}
        >
          {element}
        </RouteGuard>
      );
    }

    if (route.children) {
      return {
        ...route,
        element,
        children: applyGuards(route.children),
      } as RouteObject;
    }

    return {
      ...route,
      element,
    } as RouteObject;
  });
}

const protectedFeatureRoutes: RouteObject[] = applyGuards([
  ...dashboardRoutes,
  ...ticketRoutes,
  ...billingRoutes,
  ...subscriptionRoutes,
  ...equipmentRoutes,
  ...rmmRoutes,
  ...crmRoutes,
  ...financialRoutes,
  ...usersRoutes,
  ...settingsRoutes,
  ...systemRoutes,
]);

/**
 * SOTA Application Data Router (createBrowserRouter)
 */
export const router = createBrowserRouter([
  // Standalone Public Informational Pages
  ...publicRoutes,

  // Public Authentication Routes
  ...authRoutes,

  // Authenticated App Shell & Protected Feature Routes
  {
    element: <AppLayout />,
    children: protectedFeatureRoutes,
  },

  // Catch-all 404
  {
    path: "*",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <NotFoundPage />
      </RouteSuspenseWrapper>
    ),
  },
]);
