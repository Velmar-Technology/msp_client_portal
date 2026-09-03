import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, DashboardSkeleton } from "@/components/skeletons";

const DashboardPage = lazyWithRetry(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const TechDashboardPage = lazyWithRetry(() =>
  import("./pages/TechDashboardPage").then((m) => ({ default: m.TechDashboardPage }))
);

/**
 * Dashboard Domain Route Manifest (ADR-002 / ADR-003)
 */
export const dashboardRoutes: AppRouteObject[] = [
  {
    path: "/dashboard",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      allowedRoles: ["CLIENT", "ADMIN"],
    },
  },
  {
    path: "/tech/dashboard",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <TechDashboardPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      allowedRoles: ["TECHNICIAN"],
    },
  },
  {
    path: "/admin/dashboard",
    element: <Navigate to="/dashboard" replace />,
    handle: {
      allowedRoles: ["ADMIN"],
    },
  },
];
