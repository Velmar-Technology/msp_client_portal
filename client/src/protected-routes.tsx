/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs } from "@/components/layout/routeCrumbs";
import type { CrumbResolver } from "@/components/layout/routeCrumbs";

import { DashboardPage } from "@/pages/DashboardPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { TicketDetailPage } from "@/pages/TicketDetailPage";
import { PlansPage } from "@/pages/PlansPage";
import { BillingPage } from "@/pages/BillingPage";
import { FinancialPage } from "@/pages/FinancialPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { TechDashboardPage } from "@/pages/TechDashboardPage";
import { HelpPage } from "@/pages/HelpPage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { NotificationPreferencesPage } from "@/pages/NotificationPreferencesPage";
import { DevicesPage } from "@/pages/DevicesPage";
import { MaintenancePage } from "@/pages/MaintenancePage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { ResourcesPage } from "@/pages/ResourcesPage";

export interface AppRouteHandle {
  crumb: CrumbResolver;
}

export interface AppRouteConfig {
  path: string;
  element: React.ReactNode;
  allowedRoles?: string[];
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
  { path: "/dashboard", element: <DashboardPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/financial", element: <FinancialPage />, allowedRoles: ["ADMIN"] },
  { path: "/plans", element: <PlansPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/billing", element: <BillingPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/devices", element: <DevicesPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/resources", element: <ResourcesPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/maintenance", element: <MaintenancePage /> },

  // Tech/Admin Routes
  { path: "/tech/dashboard", element: <TechDashboardPage />, allowedRoles: ["TECHNICIAN"] },
  { path: "/admin/dashboard", element: <Navigate to="/dashboard" replace />, allowedRoles: ["ADMIN"] },
  { path: "/admin/users", element: <UserManagementPage />, allowedRoles: ["ADMIN"] },

  // Shared Routes
  { path: "/tickets", element: <TicketsPage /> },
  { path: "/tickets/:id", element: <TicketDetailPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/notifications/preferences", element: <NotificationPreferencesPage /> },
  { path: "/help", element: <HelpPage /> },
  { path: "/terms", element: <TermsPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
];

export const protectedRoutes: AppRouteConfig[] = createProtectedRoutes(RAW_PROTECTED_ROUTES);

/**
 * Dedicated Loading Presentation Component.
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

