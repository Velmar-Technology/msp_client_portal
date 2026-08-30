/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs } from "@/components/layout/routeCrumbs";
import type { CrumbResolver } from "@/components/layout/routeCrumbs";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import {
  DashboardSkeleton,
  TablePageSkeleton,
  DetailSkeleton,
  ContentPageSkeleton,
  RouteSuspenseWrapper,
} from "@/components/skeletons";

// ---- Dynamic Route Definitions using lazyWithRetry ----
export const DashboardPage = lazyWithRetry(() =>
  import("@/routes/_app/dashboard").then((m) => ({ default: m.DashboardPage || m.default }))
);
export const TicketsPage = lazyWithRetry(() =>
  import("@/routes/_app/tickets/index").then((m) => ({ default: m.TicketsPage || m.default }))
);
export const TicketDetailPage = lazyWithRetry(() =>
  import("@/routes/_app/tickets/$id").then((m) => ({ default: m.TicketDetailPage || m.default }))
);
export const PlansPage = lazyWithRetry(() =>
  import("@/routes/_app/plans").then((m) => ({ default: m.PlansPage || m.default }))
);
export const BillingPage = lazyWithRetry(() =>
  import("@/routes/_app/billing").then((m) => ({ default: m.BillingPage || m.default }))
);
export const FinancialPage = lazyWithRetry(() =>
  import("@/routes/_app/financial").then((m) => ({ default: m.FinancialPage || m.default }))
);
export const ProfilePage = lazyWithRetry(() =>
  import("@/routes/_app/profile").then((m) => ({ default: m.ProfilePage || m.default }))
);
export const TechDashboardPage = lazyWithRetry(() =>
  import("@/routes/_app/tech/dashboard").then((m) => ({ default: m.TechDashboardPage || m.default }))
);
export const CRMPage = lazyWithRetry(() =>
  import("@/routes/_app/crm").then((m) => ({ default: m.CRMPage || m.default }))
);
export const HelpPage = lazyWithRetry(() =>
  import("@/routes/_app/help").then((m) => ({ default: m.HelpPage || m.default }))
);
export const NotificationPreferencesPage = lazyWithRetry(() =>
  import("@/routes/_app/notifications/preferences").then((m) => ({
    default: m.NotificationPreferencesPage || m.default,
  }))
);
export const MaintenancePage = lazyWithRetry(() =>
  import("@/routes/_app/maintenance").then((m) => ({ default: m.MaintenancePage || m.default }))
);
export const UserManagementPage = lazyWithRetry(() =>
  import("@/routes/_app/admin/users").then((m) => ({ default: m.UserManagementPage || m.default }))
);
export const ResourcesPage = lazyWithRetry(() =>
  import("@/routes/_app/resources").then((m) => ({ default: m.ResourcesPage || m.default }))
);
export const DevicesPage = lazyWithRetry(() =>
  import("@/routes/_app/devices").then((m) => ({ default: m.DevicesPage || m.default }))
);
export const ApiStatusPage = lazyWithRetry(() =>
  import("@/routes/_app/admin/api-status").then((m) => ({ default: m.ApiStatusPage || m.default }))
);
export const TermsPage = lazyWithRetry(() =>
  import("@/routes/_public/terms").then((m) => ({ default: m.TermsPage || m.default }))
);
export const PrivacyPage = lazyWithRetry(() =>
  import("@/routes/_public/privacy").then((m) => ({ default: m.PrivacyPage || m.default }))
);

export interface AppRouteHandle {
  crumb: CrumbResolver;
}

export interface AppRouteConfig {
  path: string;
  element: React.ReactNode;
  allowedRoles?: string[];
  isPublic?: boolean;
  handle?: AppRouteHandle;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * Pure Domain Query: Returns the default fallback path when a user lacks permission for a route.
 */
export function getRoleFallbackPath(userRole?: string): string {
  if (userRole === "TECHNICIAN") {
    return "/tech/dashboard";
  }
  return "/dashboard";
}

/**
 * Pure Domain Query: Determines if a given role meets the required role boundaries for a route.
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
 * Transforms a raw route definition by attaching matching breadcrumb resolver logic.
 */
export function enrichRouteWithCrumb(route: Omit<AppRouteConfig, "handle">): AppRouteConfig {
  const crumbConfig = routeCrumbs.find((c) => c.path === route.path);
  return {
    ...route,
    handle: crumbConfig ? { crumb: crumbConfig.crumb } : undefined,
  };
}

/**
 * Maps raw route definitions into enriched application route configurations.
 */
export function createProtectedRoutes(routes: Omit<AppRouteConfig, "handle">[]): AppRouteConfig[] {
  return routes.map(enrichRouteWithCrumb);
}

const RAW_PROTECTED_ROUTES: Omit<AppRouteConfig, "handle">[] = [
  // Client Routes
  {
    path: "/dashboard",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN"],
  },
  {
    path: "/financial",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <FinancialPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["ADMIN"],
  },
  {
    path: "/plans",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PlansPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN"],
  },
  {
    path: "/billing",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <BillingPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN"],
  },
  {
    path: "/devices",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <DevicesPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
  },
  {
    path: "/rmm",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <DevicesPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
  },
  {
    path: "/resources",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ResourcesPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN"],
  },
  {
    path: "/maintenance",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <MaintenancePage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
  },

  // Tech/Admin Routes
  {
    path: "/crm",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <CRMPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["ADMIN"],
  },
  {
    path: "/tech/dashboard",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <TechDashboardPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["TECHNICIAN"],
  },
  {
    path: "/admin/dashboard",
    element: <Navigate to="/dashboard" replace />,
    allowedRoles: ["ADMIN"],
  },
  {
    path: "/admin/users",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <UserManagementPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["ADMIN"],
  },
  {
    path: "/admin/api-status",
    element: (
      <RouteSuspenseWrapper fallback={<DashboardSkeleton />}>
        <ApiStatusPage />
      </RouteSuspenseWrapper>
    ),
    allowedRoles: ["ADMIN"],
  },

  // Shared Routes
  {
    path: "/tickets",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <TicketsPage />
      </RouteSuspenseWrapper>
    ),
  },
  {
    path: "/tickets/:id",
    element: (
      <RouteSuspenseWrapper fallback={<DetailSkeleton />}>
        <TicketDetailPage />
      </RouteSuspenseWrapper>
    ),
  },
  {
    path: "/profile",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ProfilePage />
      </RouteSuspenseWrapper>
    ),
  },
  {
    path: "/notifications/preferences",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <NotificationPreferencesPage />
      </RouteSuspenseWrapper>
    ),
  },
  {
    path: "/help",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <HelpPage />
      </RouteSuspenseWrapper>
    ),
  },
  {
    path: "/terms",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <TermsPage />
      </RouteSuspenseWrapper>
    ),
    isPublic: true,
  },
  {
    path: "/privacy",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PrivacyPage />
      </RouteSuspenseWrapper>
    ),
    isPublic: true,
  },
];

export const protectedRoutes: AppRouteConfig[] = createProtectedRoutes(RAW_PROTECTED_ROUTES);

/**
 * Route Preloader Registry for Intent & Idle Preloading.
 */
export const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => DashboardPage.preload(),
  "/financial": () => FinancialPage.preload(),
  "/crm": () => CRMPage.preload(),
  "/plans": () => PlansPage.preload(),
  "/billing": () => BillingPage.preload(),
  "/devices": () => DevicesPage.preload(),
  "/rmm": () => DevicesPage.preload(),
  "/resources": () => ResourcesPage.preload(),
  "/maintenance": () => MaintenancePage.preload(),
  "/tech/dashboard": () => TechDashboardPage.preload(),
  "/admin/users": () => UserManagementPage.preload(),
  "/admin/api-status": () => ApiStatusPage.preload(),
  "/tickets": () => TicketsPage.preload(),
  "/profile": () => ProfilePage.preload(),
  "/notifications/preferences": () => NotificationPreferencesPage.preload(),
  "/help": () => HelpPage.preload(),
  "/terms": () => TermsPage.preload(),
  "/privacy": () => PrivacyPage.preload(),
};

/**
 * Preload a target route chunk on intent (hover/focus).
 */
export function preloadRoute(path: string): void {
  const cleanPath = path.split("?")[0];
  const preloader = routePreloaders[cleanPath];
  if (preloader) {
    preloader().catch(() => {});
  }
}

/**
 * Dedicated Loading Presentation Component.
 */
export function RouteLoadingSpinner() {
  return (
    <div aria-label="Loading page content" className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

/**
 * ProtectedRoute Component: Guard wrapper enforcing authentication and role-based access control.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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

  return <>{children}</>;
}
