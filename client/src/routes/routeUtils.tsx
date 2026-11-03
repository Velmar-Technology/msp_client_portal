import React from "react";
import {
  Navigate,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from "react-router-dom";
import type { FetchQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { FeatureRouteGuard } from "@/components/shared/FeatureRouteGuard";
import { queryClient } from "@/lib/queryClient";
import type { FeatureCode } from "@/constants/subscriptions";

/**
 * Pure Domain Query: Returns role-specific dashboard fallback path for unauthorized users.
 */
export function getRoleFallbackPath(userRole?: string): string {
  if (userRole === "TECHNICIAN") {
    return "/tech/dashboard";
  }
  return "/dashboard";
}

/**
 * Pure Domain Query: Determines whether the user role is authorized for the given route allowedRoles.
 */
export function isRoleAuthorized(userRole?: string, allowedRoles?: string[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  if (!userRole) {
    return false;
  }
  return allowedRoles.includes(userRole);
}

const FRONTEND_IMPLIED_ACTIONS: Record<string, ReadonlySet<string>> = {
  "*": new Set(["*"]),
  manage: new Set(["manage", "write", "create", "update", "delete", "read"]),
  write: new Set(["write", "create", "update", "read"]),
  create: new Set(["create"]),
  update: new Set(["update"]),
  delete: new Set(["delete"]),
  read: new Set(["read"]),
};

/**
 * Pure Domain Query: Evaluates whether a user's dynamic RBAC permissions satisfy a required capability
 * under strict Least Privilege (exact match, global '*', explicit '<prefix>:*' wildcard, or same-scope action dominance).
 *
 * @param userPermissions - Array of permission codes held by the user (or undefined when legacy role fallback is active)
 * @param requiredPermission - Required capability code (e.g. 'helpdesk:tickets:read')
 * @returns Boolean indicating whether the capability check passes
 * @see BL-302
 */
export function hasFrontendPermission(
  userPermissions: string[] | undefined,
  requiredPermission?: string | string[]
): boolean {
  if (!requiredPermission) return true;
  if (!userPermissions) return true;

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.length === 0 || requiredPermission.some((perm) => hasFrontendPermission(userPermissions, perm));
  }

  const reqParts = requiredPermission.split(":");
  const reqAction = reqParts[reqParts.length - 1];
  const reqScopeParts = reqParts.slice(0, -1);

  for (const granted of userPermissions) {
    if (granted === "*" || granted === requiredPermission) {
      return true;
    }
    if (granted.endsWith(":*")) {
      const prefix = granted.slice(0, -1);
      if (requiredPermission.startsWith(prefix)) {
        return true;
      }
    }
    const grantParts = granted.split(":");
    if (grantParts.length < 2 || reqScopeParts.length === 0) continue;

    const grantAction = grantParts[grantParts.length - 1];
    const grantScopeParts = grantParts.slice(0, -1);

    // Least Privilege: parent scopes do NOT implicitly leak into child sub-modules
    if (grantScopeParts.length !== reqScopeParts.length) continue;
    if (!grantScopeParts.every((seg, idx) => seg === reqScopeParts[idx])) continue;

    const implied = FRONTEND_IMPLIED_ACTIONS[grantAction];
    if (grantAction === reqAction || implied?.has("*") || implied?.has(reqAction)) {
      return true;
    }
  }

  return false;
}

/**
 * Loading spinner element shown during initial auth session hydration.
 */
export function RouteLoadingSpinner() {
  return (
    <div
      aria-label="Loading page content"
      className="min-h-screen flex items-center justify-center bg-background"
    >
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string | string[];
  requiredFeature?: FeatureCode;
}

/**
 * RouteGuard Component: Guard wrapper enforcing authentication, Dynamic RBAC capabilities (with role fallback), and subscription features.
 */
export function RouteGuard({
  children,
  allowedRoles,
  requiredPermission,
  requiredFeature,
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Dual-check (ADR-017 / BL-302): When user.permissions is present and requiredPermission is specified,
  // enforce capability check; otherwise fall back to allowedRoles.
  const isAuthorized =
    requiredPermission && Array.isArray(user?.permissions)
      ? hasFrontendPermission(user.permissions, requiredPermission)
      : isRoleAuthorized(user?.role, allowedRoles);

  if (!isAuthorized) {
    const fallbackPath = getRoleFallbackPath(user?.role);
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredFeature) {
    return <FeatureRouteGuard requiredFeature={requiredFeature}>{children}</FeatureRouteGuard>;
  }

  return <>{children}</>;
}

// Backward-compatible alias
export const ProtectedRoute = RouteGuard;

/**
 * PublicRoute Component: Redirects authenticated users away from public login/register pages to their dashboard.
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <RouteLoadingSpinner />;
  }

  if (isAuthenticated) {
    const target = user?.role === "TECHNICIAN" ? "/tech/dashboard" : "/dashboard";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

// Backward-compatible alias
export const PublicOnlyRoute = PublicRoute;

/**
 * Top-level route error boundary for React Router v7 Data Mode.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred while loading this page.";
  let statusCode = 500;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-card border border-border p-6 rounded-md shadow-xs">
        <h2 className="text-lg font-bold text-destructive mb-2">Error {statusCode}</h2>
        <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps lazy page component with standard RouteSuspenseWrapper and localized skeleton.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withSuspense(Component: React.ComponentType<any>, fallback = <ContentPageSkeleton />) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function SuspenseWrappedPage(props: any) {
    return (
      <RouteSuspenseWrapper fallback={fallback}>
        <Component {...props} />
      </RouteSuspenseWrapper>
    );
  };
}

/**
 * Factory creating non-blocking route loaders that prefetch TanStack Query cache.
 */
export function createPrefetchLoader<TQueryFnData, TError, TData, TQueryKey extends readonly unknown[]>(
  queryOptionsFactory: (args: LoaderFunctionArgs) => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>
) {
  return async (args: LoaderFunctionArgs) => {
    try {
      const options = queryOptionsFactory(args);
      queryClient.prefetchQuery(options).catch(() => {});
    } catch {
      // Gracefully ignore loader param extraction errors
    }
    return null;
  };
}

/**
 * Factory creating blocking route loaders that await TanStack Query cache warm-up.
 */
export function createEnsureDataLoader<TQueryFnData, TError, TData, TQueryKey extends readonly unknown[]>(
  queryOptionsFactory: (args: LoaderFunctionArgs) => FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>
) {
  return async (args: LoaderFunctionArgs) => {
    try {
      const options = queryOptionsFactory(args);
      return await queryClient.ensureQueryData(options);
    } catch {
      return null;
    }
  };
}
