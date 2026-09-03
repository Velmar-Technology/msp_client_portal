import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton, ContentPageSkeleton } from "@/components/skeletons";

const CRMPage = lazyWithRetry(() =>
  import("./pages/CRMPage").then((m) => ({ default: m.CRMPage }))
);
const CRMCustomPlanPage = lazyWithRetry(() =>
  import("./pages/CRMCustomPlanPage").then((m) => ({ default: m.CRMCustomPlanPage }))
);

/**
 * CRM Domain Route Manifest (ADR-002 / ADR-003)
 */
export const crmRoutes: AppRouteObject[] = [
  {
    path: "/crm",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <CRMPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.crm"), to: "/crm" }),
      allowedRoles: ["ADMIN"],
    },
  },
  {
    path: "/crm/custom-plans",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <CRMCustomPlanPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => [
        { label: t("nav.crm"), to: "/crm" },
        { label: t("crm.customPlans") },
      ],
      allowedRoles: ["ADMIN"],
    },
  },
];
