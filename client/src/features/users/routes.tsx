import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton } from "@/components/skeletons";

const UserManagementPage = lazyWithRetry(() =>
  import("./pages/UserManagementPage").then((m) => ({ default: m.UserManagementPage }))
);

/**
 * Users & Identity Domain Route Manifest (ADR-002 / ADR-014 / ADR-017).
 * Standardized on canonical `/users` path gated by Dynamic RBAC `users:read`,
 * with backward-compatible redirect from legacy `/admin/users`.
 *
 * @see ADR-014
 * @see ADR-017
 * @see ADR-018
 */
export const usersRoutes: AppRouteObject[] = [
  {
    path: "/users",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <UserManagementPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.userManagement", { defaultValue: "User Management" }), to: "/users" }),
      requiredPermission: "users:read",
    },
  },
  {
    path: "/admin/users",
    element: <Navigate to="/users" replace />,
  },
];
