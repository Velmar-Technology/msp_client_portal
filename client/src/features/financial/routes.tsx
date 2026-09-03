import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, DashboardSkeleton } from "@/components/skeletons";

const FinancialPage = lazyWithRetry(() =>
  import("./pages/FinancialPage").then((m) => ({ default: m.FinancialPage }))
);

/**
 * Financial & OpEx Domain Route Manifest (ADR-002 / ADR-003)
 */
export const financialRoutes: AppRouteObject[] = [
  {
    path: "/financial",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <FinancialPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.financial"), to: "/financial" }),
      allowedRoles: ["ADMIN"],
    },
  },
];
