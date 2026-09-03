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
  requiredFeature?: FeatureCode;
}

/**
 * RouteGuard Component: Guard wrapper enforcing authentication, role boundaries, and subscription features.
 */
export function RouteGuard({ children, allowedRoles, requiredFeature }: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isRoleAuthorized(user?.role, allowedRoles)) {
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
