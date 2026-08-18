import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { HomePage } from "@/pages/HomePage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactErrorBoundary } from "@shared/errors";
import { Toaster } from "@/components/ui/sonner";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { protectedRoutes, ProtectedRoute } from "@/protected-routes";

// Redirect if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;

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
          <Routes>
            {/* Standalone Public Pages (Landing, Terms, Privacy) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>

            {/* Public Authentication Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </ReactErrorBoundary>
  );
}
