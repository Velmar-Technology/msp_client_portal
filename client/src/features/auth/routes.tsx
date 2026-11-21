import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { PublicRoute } from "@/routes/routeUtils";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const LoginPage = lazyWithRetry(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazyWithRetry(() =>
  import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);

/**
 * Auth Domain Route Manifest (ADR-002 / ADR-003)
 */
export const authRoutes: RouteObject[] = [
  {
    element: (
      <PublicRoute>
        <Outlet />
      </PublicRoute>
    ),
    children: [
      {
        path: "/base/login",
        element: (
          <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
            <LoginPage />
          </RouteSuspenseWrapper>
        ),
      },
      {
        path: "/base/register",
        element: (
          <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
            <RegisterPage />
          </RouteSuspenseWrapper>
        ),
      },
      {
        path: "/base/forgot-password",
        element: <Navigate to="/base/login?openModal=forgot-password" replace />,
      },
      {
        path: "/base/reset-password",
        element: <Navigate to="/base/login?openModal=reset-password" replace />,
      },
    ],
  },
];
