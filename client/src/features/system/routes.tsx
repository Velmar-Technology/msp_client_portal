import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";

const ApiStatusPage = lazyWithRetry(() =>
  import("./pages/ApiStatusPage").then((m) => ({ default: m.ApiStatusPage }))
);
const StyleGuidePage = lazyWithRetry(() =>
  import("@/components/shared/StyleGuidePage").then((m) => ({ default: m.StyleGuidePage }))
);

/**
 * System & Health Domain Route Manifest (ADR-002 / ADR-003)
 */
export const systemRoutes: AppRouteObject[] = [
  {
    path: "/admin/api-status",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ApiStatusPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.apiStatus"), to: "/admin/api-status" }),
      allowedRoles: ["ADMIN"],
    },
  },
  {
    path: "/dev/style-guide",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <StyleGuidePage />
      </RouteSuspenseWrapper>
    ),
  },
];
