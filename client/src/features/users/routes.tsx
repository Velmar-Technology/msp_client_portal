import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton } from "@/components/skeletons";

const UserManagementPage = lazyWithRetry(() =>
  import("./pages/UserManagementPage").then((m) => ({ default: m.UserManagementPage }))
);

/**
 * Users & Identity Domain Route Manifest (ADR-002 / ADR-003)
 */
export const usersRoutes: AppRouteObject[] = [
  {
    path: "/admin/users",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <UserManagementPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.userManagement"), to: "/admin/users" }),
      allowedRoles: ["ADMIN"],
    },
  },
];
