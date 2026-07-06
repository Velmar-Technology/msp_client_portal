import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { PlansPage } from './pages/PlansPage';
import { BillingPage } from './pages/BillingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TechDashboard } from './pages/TechDashboard';
import { HelpPage } from './pages/HelpPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotificationPreferencesPage } from './pages/NotificationPreferencesPage';
import { DevicesPage } from './pages/DevicesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ThemeProvider } from './components/theme-provider';
import { ReactErrorBoundary } from '@shared/errors';
import { Toaster } from '@/components/ui/sonner';
import { routeCrumbs } from './components/layout/routeCrumbs';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'TECHNICIAN') return <Navigate to="/tech/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Redirect if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'TECHNICIAN') return <Navigate to="/tech/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

interface AppRouteConfig {
  path: string;
  element: React.ReactNode;
  allowedRoles?: string[];
  handle?: {
    crumb: (t: any, params: any, user: any) => any;
  };
}

const protectedRoutes: AppRouteConfig[] = [
  // Client Routes
  { path: "/dashboard", element: <ClientDashboard />, allowedRoles: ["CLIENT"] },
  { path: "/plans", element: <PlansPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/billing", element: <BillingPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  { path: "/devices", element: <DevicesPage />, allowedRoles: ["CLIENT", "ADMIN"] },
  // Tech/Admin Routes
  { path: "/tech/dashboard", element: <TechDashboard />, allowedRoles: ["TECHNICIAN"] },
  { path: "/admin/dashboard", element: <AdminDashboard />, allowedRoles: ["ADMIN"] },
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

export function App() {
  return (
    <ReactErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="msp-portal-theme">
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Routes inside Layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {protectedRoutes.map(({ path, element, allowedRoles, handle }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    allowedRoles ? (
                      <ProtectedRoute allowedRoles={allowedRoles}>
                        {element}
                      </ProtectedRoute>
                    ) : (
                      element
                    )
                  }
                  handle={handle}
                />
              ))}
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </ReactErrorBoundary>
  );
}

