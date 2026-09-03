import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton } from "@/components/skeletons";
import { FEATURE_CODES } from "@/constants/subscriptions";

const MaintenancePage = lazyWithRetry(() =>
  import("./pages/MaintenancePage").then((m) => ({ default: m.MaintenancePage }))
);

/**
 * RMM & Maintenance Domain Route Manifest (ADR-002 / ADR-003)
 */
export const rmmRoutes: AppRouteObject[] = [
  {
    path: "/maintenance",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <MaintenancePage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.maintenance"), to: "/maintenance" }),
      allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
      requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT,
    },
  },
];
