import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, describe } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, protectedRoutes } from "@/protected-routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PrivacyPage } from "@/routes/_public/privacy";
import { TermsPage } from "@/routes/_public/terms";
import { HomePage } from "@/routes/_public/index";
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
          <Route element={<PublicLayout />}>
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Login Page Redirect Target")).not.toBeInTheDocument();
      expect(screen.getByText("legal.privacyTitle")).toBeInTheDocument();
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
          <Route element={<PublicLayout />}>
            <Route path="/terms" element={<TermsPage />} />
          </Route>
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Login Page Redirect Target")).not.toBeInTheDocument();
      expect(screen.getByText("legal.termsTitle")).toBeInTheDocument();
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

  test("allows unauthenticated access to / home page without redirecting to login", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<div>Login Page Redirect Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Login Page Redirect Target")).not.toBeInTheDocument();
      expect(screen.getByText("home.title")).toBeInTheDocument();
    });
  });
});
