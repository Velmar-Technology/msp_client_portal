/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs } from "@/components/layout/routeCrumbs";

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

export interface AppRouteConfig {
  path: string;
  element: React.ReactNode;
  allowedRoles?: string[];
  handle?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    crumb: (t: any, params: any, user: any) => any;
  };
}

export const protectedRoutes: AppRouteConfig[] = [
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
].map((route) => {
  const crumbConfig = routeCrumbs.find((c) => c.path === route.path);
  return {
    ...route,
    handle: crumbConfig ? { crumb: crumbConfig.crumb } : undefined,
  };
});

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === "ADMIN") return <Navigate to="/dashboard" replace />;
    if (user.role === "TECHNICIAN") return <Navigate to="/tech/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
