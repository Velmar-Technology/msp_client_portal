import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, describe } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, protectedRoutes } from "@/protected-routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en_US", changeLanguage: vi.fn() },
  }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/services/subscriptionService", () => ({
  subscriptionService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/store/useNotificationStore", () => {
  const store = {
    fetchNotifications: vi.fn().mockResolvedValue([]),
    startStream: vi.fn(),
    stopStream: vi.fn(),
  };
  return {
    useNotificationStore: (selector?: (state: unknown) => unknown) => {
      if (selector) return selector(store);
      return store;
    },
  };
});

describe("Public Unauthenticated Routes (/terms & /privacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("allows unauthenticated access to /privacy without redirecting to login", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <Routes>
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
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Login Page Redirect Target")).not.toBeInTheDocument();
      expect(screen.queryByText("nav.dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("nav.myTickets")).not.toBeInTheDocument();
    });
  });

  test("allows unauthenticated access to /terms without redirecting to login and hides sidebar options", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <Routes>
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
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Login Page Redirect Target")).not.toBeInTheDocument();
      expect(screen.queryByText("nav.dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("nav.myTickets")).not.toBeInTheDocument();
    });
  });

  test("redirects unauthenticated user to /login on protected route /dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
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
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page Redirect Target")).toBeInTheDocument();
    });
  });
});
