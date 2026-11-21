import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";
import { useAuth } from "@/hooks/useAuth";
import { getRoleFallbackPath } from "@/routes/routeUtils";

function BaseLandingRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/base/login" replace />;
  }
  return <Navigate to={getRoleFallbackPath(user?.role)} replace />;
}

/**
 * Parent Base Domain Route Manifest (ADR-017 / ADR-018).
 * Child sub-modules ('base.users') register their own routes.
 */
export const baseRoutes: AppRouteObject[] = [
  {
    path: "/base",
    children: [
      {
        index: true,
        element: <BaseLandingRedirect />,
      },
    ],
  },
];
