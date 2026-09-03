import "@testing-library/jest-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PasswordManagerPage } from "./PasswordManagerPage";
import { systemService } from "@/services/systemService";
import enTranslations from "@/locales/en_US.json";

vi.mock("@/services/systemService", () => ({
  systemService: {
    resetVaultAccess: vi.fn(),
  },
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

const mockT = (key: string, defaultVal?: string) => {
  const parts = key.split(".");
  let current: any = enTranslations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return defaultVal || key;
    }
  }
  return typeof current === "string" ? current : defaultVal || key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: "en" },
  }),
}));

describe("PasswordManagerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders hero card, quick setup, clients, and trouble card", () => {
    render(
      <MemoryRouter>
        <PasswordManagerPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Password Manager")).toBeInTheDocument();
    expect(screen.getByText("Hosted Vaultwarden Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Open Web Vault")).toBeInTheDocument();
    expect(screen.getByText("Trouble Logging In?")).toBeInTheDocument();
    expect(screen.getByText("Reset Vault Access")).toBeInTheDocument();
    expect(screen.getByText("Zero-Knowledge Security Policy")).toBeInTheDocument();
  });

  test("opens confirmation dialog when Reset Vault Access is clicked", async () => {
    render(
      <MemoryRouter>
        <PasswordManagerPage />
      </MemoryRouter>
    );

    const resetBtn = screen.getByRole("button", { name: /Reset Vault Access/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText("Reset Vault Access & Re-Invite")).toBeInTheDocument();
      expect(screen.getByText(/Any personal, unshared passwords stored in your locked vault will be permanently lost/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Yes, Reset & Send Invite/i })).toBeInTheDocument();
    });
  });

  test("calls systemService.resetVaultAccess and shows toast on confirm", async () => {
    vi.mocked(systemService.resetVaultAccess).mockResolvedValueOnce({
      success: true,
      message: "A fresh invitation has been dispatched.",
    });

    render(
      <MemoryRouter>
        <PasswordManagerPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Reset Vault Access/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Yes, Reset & Send Invite/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Yes, Reset & Send Invite/i }));

    await waitFor(() => {
      expect(systemService.resetVaultAccess).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith(
        "Invitation Dispatched",
        expect.objectContaining({
          description: "A fresh invitation has been dispatched.",
        })
      );
    });
  });
});
