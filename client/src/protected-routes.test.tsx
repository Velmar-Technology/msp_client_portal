import { describe, it, expect } from "vitest";
import {
  getRoleFallbackPath,
  isRoleAuthorized,
  enrichRouteWithCrumb,
  protectedRoutes,
} from "./protected-routes";

describe("Protected Routes Authorization Helpers", () => {
  describe("getRoleFallbackPath", () => {
    it("should return /tech/dashboard for TECHNICIAN role", () => {
      expect(getRoleFallbackPath("TECHNICIAN")).toBe("/tech/dashboard");
    });

    it("should return /dashboard for ADMIN, CLIENT or undefined roles", () => {
      expect(getRoleFallbackPath("ADMIN")).toBe("/dashboard");
      expect(getRoleFallbackPath("CLIENT")).toBe("/dashboard");
      expect(getRoleFallbackPath(undefined)).toBe("/dashboard");
    });
  });

  describe("isRoleAuthorized", () => {
    it("should return true when no allowedRoles are specified", () => {
      expect(isRoleAuthorized("CLIENT", undefined)).toBe(true);
      expect(isRoleAuthorized("CLIENT", [])).toBe(true);
      expect(isRoleAuthorized(undefined, undefined)).toBe(true);
    });

    it("should return false when userRole is undefined but allowedRoles are specified", () => {
      expect(isRoleAuthorized(undefined, ["ADMIN"])).toBe(false);
    });

    it("should return true when userRole is included in allowedRoles", () => {
      expect(isRoleAuthorized("ADMIN", ["CLIENT", "ADMIN"])).toBe(true);
      expect(isRoleAuthorized("TECHNICIAN", ["TECHNICIAN"])).toBe(true);
    });

    it("should return false when userRole is not included in allowedRoles", () => {
      expect(isRoleAuthorized("CLIENT", ["ADMIN"])).toBe(false);
      expect(isRoleAuthorized("TECHNICIAN", ["CLIENT", "ADMIN"])).toBe(false);
    });
  });

  describe("createProtectedRoutes & enrichRouteWithCrumb", () => {
    it("should attach breadcrumb handle if route path matches routeCrumbs", () => {
      const rawRoute = { path: "/financial", element: null };
      const enriched = enrichRouteWithCrumb(rawRoute);
      expect(enriched.handle).toBeDefined();
      expect(typeof enriched.handle?.crumb).toBe("function");
    });

    it("should not attach handle if route path has no matching crumb", () => {
      const rawRoute = { path: "/unmatched-route-xyz", element: null };
      const enriched = enrichRouteWithCrumb(rawRoute);
      expect(enriched.handle).toBeUndefined();
    });

    it("should correctly enrich all exported protectedRoutes", () => {
      expect(protectedRoutes.length).toBeGreaterThan(0);
      const financialRoute = protectedRoutes.find((r) => r.path === "/financial");
      expect(financialRoute).toBeDefined();
      expect(financialRoute?.handle?.crumb).toBeDefined();
    });
  });
});
