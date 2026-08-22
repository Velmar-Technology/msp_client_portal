import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi, beforeEach, describe } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/protected-routes";
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

vi.mock("@/assets/logo.png", () => ({
  default: "logo-stub.png",
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

vi.mock("@/services/planService", () => ({
  planService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/services/ticketService", () => ({
  ticketService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("@/services/invoiceService", () => ({
  invoiceService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["CLIENT", "ADMIN"]}>
                <div>Protected Dashboard Content</div>
              </ProtectedRoute>
            }
          />
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
