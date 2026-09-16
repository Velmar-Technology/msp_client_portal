import "@testing-library/jest-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ByokSettingsPage } from "./ByokSettingsPage";
import { useEntitlements } from "@/hooks/useEntitlements";
import * as byokApi from "../api/byok";
import enTranslations from "@/locales/en_US.json";

vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: vi.fn(),
}));

vi.mock("../api/byok", () => ({
  useTenantByokStatus: vi.fn(),
  useSaveTenantByok: vi.fn(),
  useTestByokConnection: vi.fn(),
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

describe("ByokSettingsPage", () => {
  const mockMutateSave = vi.fn();
  const mockMutateTest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useEntitlements).mockReturnValue({
      hasFeature: vi.fn(() => true),
      isFeatureLocked: vi.fn(() => false),
      getRequiredTierForFeature: vi.fn(() => "PL-CAF"),
      hasPlanFeature: vi.fn(() => true),
    } as any);

    vi.mocked(byokApi.useTenantByokStatus).mockReturnValue({
      data: {
        tenantId: "11111111-2222-3333-4444-555555555555",
        provider: "openai",
        isConfigured: true,
        keyMasked: "sk-p...7890",
        model: "gpt-4o",
      },
      isLoading: false,
    } as any);

    vi.mocked(byokApi.useSaveTenantByok).mockReturnValue({
      mutateAsync: mockMutateSave,
      isPending: false,
    } as any);

    vi.mocked(byokApi.useTestByokConnection).mockReturnValue({
      mutateAsync: mockMutateTest,
      isPending: false,
    } as any);
  });

  test("renders FeatureLockedPreview when CAF_EDUCATION_AGENT is locked", () => {
    vi.mocked(useEntitlements).mockReturnValue({
      hasFeature: vi.fn(() => false),
      isFeatureLocked: vi.fn(() => true),
      getRequiredTierForFeature: vi.fn(() => "PL-CAF"),
      hasPlanFeature: vi.fn(() => false),
    } as any);

    render(
      <MemoryRouter>
        <ByokSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Agente de Calidad Educativa CAF/i)).toBeInTheDocument();
  });

  test("renders BYOK settings form when user is entitled", () => {
    render(
      <MemoryRouter>
        <ByokSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Artificial Intelligence & CAF Quality/i)).toBeInTheDocument();
    expect(screen.getByText(/Configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Test Connection/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Credentials/i })).toBeInTheDocument();
  });

  test("switches between Web Config and Desktop MCP tabs", async () => {
    render(
      <MemoryRouter>
        <ByokSettingsPage />
      </MemoryRouter>,
    );

    const desktopTab = screen.getByRole("tab", { name: /Claude Desktop/i });
    fireEvent.mouseDown(desktopTab, { button: 0, ctrlKey: false });

    await waitFor(() => {
      expect(screen.getByText(/MCP Setup/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero-Secret Security Guarantee/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copiar|Copy/i })).toBeInTheDocument();
    });
  });

  test("triggers connection test and shows success feedback", async () => {
    mockMutateTest.mockResolvedValueOnce({
      success: true,
      latencyMs: 142,
      message: "OpenAI API key validated successfully",
      modelsAvailable: ["gpt-4o"],
    });

    render(
      <MemoryRouter>
        <ByokSettingsPage />
      </MemoryRouter>,
    );

    const keyInput = screen.getByLabelText(/Secret API Key/i);
    fireEvent.change(keyInput, { target: { value: "sk-proj-test-new-key" } });

    const testBtn = screen.getByRole("button", { name: /Test Connection/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(mockMutateTest).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai",
          apiKey: "sk-proj-test-new-key",
        }),
      );
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Connection verified successfully"));
    });
  });
});
