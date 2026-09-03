import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  isRoleAuthorized,
  getRoleFallbackPath,
  RouteGuard,
  PublicRoute,
  createPrefetchLoader,
  createEnsureDataLoader,
} from "./routeUtils";
import { queryClient } from "@/lib/queryClient";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock FeatureRouteGuard
vi.mock("@/components/shared/FeatureRouteGuard", () => ({
  FeatureRouteGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="feature-guard">{children}</div>
  ),
}));

describe("routeUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isRoleAuthorized", () => {
    it("should allow any role if allowedRoles is undefined or empty", () => {
      expect(isRoleAuthorized("CLIENT", undefined)).toBe(true);
      expect(isRoleAuthorized("ADMIN", [])).toBe(true);
    });

    it("should reject if userRole is undefined", () => {
      expect(isRoleAuthorized(undefined, ["ADMIN"])).toBe(false);
    });

    it("should allow if userRole is in allowedRoles", () => {
      expect(isRoleAuthorized("ADMIN", ["ADMIN", "CLIENT"])).toBe(true);
      expect(isRoleAuthorized("TECHNICIAN", ["ADMIN", "CLIENT"])).toBe(false);
    });
  });

  describe("getRoleFallbackPath", () => {
    it("should return /tech/dashboard for TECHNICIAN", () => {
      expect(getRoleFallbackPath("TECHNICIAN")).toBe("/tech/dashboard");
    });

    it("should return /dashboard for other roles", () => {
      expect(getRoleFallbackPath("CLIENT")).toBe("/dashboard");
      expect(getRoleFallbackPath("ADMIN")).toBe("/dashboard");
      expect(getRoleFallbackPath(undefined)).toBe("/dashboard");
    });
  });

  describe("RouteGuard Component", () => {
    it("should render spinner when auth is loading", () => {
      mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null });

      render(
        <MemoryRouter>
          <RouteGuard>
            <div>Protected Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(screen.getByLabelText("Loading page content")).toBeInTheDocument();
    });

    it("should redirect to /login when unauthenticated", () => {
      mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null });

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RouteGuard>
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("should redirect to fallback path when role is not authorized", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { role: "CLIENT" },
      });

      render(
        <MemoryRouter initialEntries={["/admin-only"]}>
          <Routes>
            <Route
              path="/admin-only"
              element={
                <RouteGuard allowedRoles={["ADMIN"]}>
                  <div>Admin Content</div>
                </RouteGuard>
              }
            />
            <Route path="/dashboard" element={<div>Client Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Client Dashboard")).toBeInTheDocument();
    });

    it("should wrap in FeatureRouteGuard when requiredFeature is specified", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { role: "CLIENT" },
      });

      render(
        <MemoryRouter>
          <RouteGuard requiredFeature="RMM_PATCH_MANAGEMENT">
            <div>Feature Gated Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(screen.getByTestId("feature-guard")).toBeInTheDocument();
      expect(screen.getByText("Feature Gated Content")).toBeInTheDocument();
    });

    it("should render children when authenticated and authorized", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { role: "ADMIN" },
      });

      render(
        <MemoryRouter>
          <RouteGuard allowedRoles={["ADMIN"]}>
            <div>Authorized Content</div>
          </RouteGuard>
        </MemoryRouter>
      );

      expect(screen.getByText("Authorized Content")).toBeInTheDocument();
    });
  });

  describe("PublicRoute Component", () => {
    it("should redirect authenticated technician to /tech/dashboard", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: true,
        user: { role: "TECHNICIAN" },
      });

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <div>Login Form</div>
                </PublicRoute>
              }
            />
            <Route path="/tech/dashboard" element={<div>Tech Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Tech Dashboard")).toBeInTheDocument();
    });

    it("should render children for unauthenticated users", () => {
      mockUseAuth.mockReturnValue({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter>
          <PublicRoute>
            <div>Login Form</div>
          </PublicRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Form")).toBeInTheDocument();
    });
  });

  describe("Loader Factories", () => {
    it("createPrefetchLoader should invoke queryClient.prefetchQuery", async () => {
      const prefetchSpy = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined as never);
      const loader = createPrefetchLoader(() => ({
        queryKey: ["test"],
        queryFn: async () => ({ ok: true }),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await loader({} as any);
      expect(res).toBeNull();
      expect(prefetchSpy).toHaveBeenCalled();
    });

    it("createEnsureDataLoader should invoke queryClient.ensureQueryData", async () => {
      const mockData = { id: "123", title: "Test" };
      const ensureSpy = vi.spyOn(queryClient, "ensureQueryData").mockResolvedValue(mockData as never);
      const loader = createEnsureDataLoader(() => ({
        queryKey: ["test", "123"],
        queryFn: async () => mockData,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await loader({} as any);
      expect(res).toEqual(mockData);
      expect(ensureSpy).toHaveBeenCalled();
    });
  });
});
