import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactErrorBoundary } from "@shared/errors";
import { Toaster } from "@/components/ui/sonner";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { protectedRoutes, ProtectedRoute } from "@/protected-routes";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";

// ---- Lazy-loaded Public & Auth Pages ----
const HomePage = lazyWithRetry(() =>
  import("@/routes/_public/index").then((m) => ({ default: m.HomePage || m.default }))
);
const TermsPage = lazyWithRetry(() =>
  import("@/routes/_public/terms").then((m) => ({ default: m.TermsPage || m.default }))
);
const PrivacyPage = lazyWithRetry(() =>
  import("@/routes/_public/privacy").then((m) => ({ default: m.PrivacyPage || m.default }))
);
const LoginPage = lazyWithRetry(() =>
  import("@/routes/_auth/login").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazyWithRetry(() =>
  import("@/routes/_auth/register").then((m) => ({ default: m.RegisterPage }))
);
const NotFoundPage = lazyWithRetry(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Redirect if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    if (user?.role === "ADMIN") return <Navigate to="/dashboard" replace />;
    if (user?.role === "TECHNICIAN") return <Navigate to="/tech/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function App() {
  useSessionMonitor();

  return (
    <ReactErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="msp-portal-theme">
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Standalone Public Pages (Landing, Terms, Privacy) */}
            <Route element={<PublicLayout />}>
              <Route
                path="/"
                element={
                  <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                    <HomePage />
                  </RouteSuspenseWrapper>
                }
              />
              <Route
                path="/terms"
                element={
                  <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                    <TermsPage />
                  </RouteSuspenseWrapper>
                }
              />
              <Route
                path="/privacy"
                element={
                  <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                    <PrivacyPage />
                  </RouteSuspenseWrapper>
                }
              />
            </Route>

            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                    <LoginPage />
                  </RouteSuspenseWrapper>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                    <RegisterPage />
                  </RouteSuspenseWrapper>
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={<Navigate to="/login?openModal=forgot-password" replace />}
            />
            <Route
              path="/reset-password"
              element={<Navigate to="/login?openModal=reset-password" replace />}
            />

            {/* App Layout Routes */}
            <Route element={<AppLayout />}>
              {protectedRoutes.map(({ path, element, allowedRoles, isPublic, handle }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    isPublic ? (
                      element
                    ) : (
                      <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
                    )
                  }
                  handle={handle}
                />
              ))}
            </Route>

            {/* Catch-all Route */}
            <Route
              path="*"
              element={
                <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
                  <NotFoundPage />
                </RouteSuspenseWrapper>
              }
            />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </ReactErrorBoundary>
  );
}
