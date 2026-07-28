import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactErrorBoundary } from "@shared/errors";
import { Toaster } from "@/components/ui/sonner";
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
  return (
    <ReactErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="msp-portal-theme">
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
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

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Routes inside Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {protectedRoutes.map(({ path, element, allowedRoles, handle }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    allowedRoles ? <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute> : element
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
