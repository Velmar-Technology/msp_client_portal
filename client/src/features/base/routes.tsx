import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";

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
        element: <Navigate to="/admin/users" replace />,
      },
    ],
  },
];
