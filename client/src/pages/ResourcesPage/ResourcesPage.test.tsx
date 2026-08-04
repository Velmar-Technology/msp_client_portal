import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { ResourcesPage } from "@/pages/ResourcesPage/ResourcesPage";
import { subscriptionService } from "@/services/subscriptionService";
import enTranslations from "@/locales/en_US.json";

vi.mock("@/services/subscriptionService", () => ({
  subscriptionService: {
    getAll: vi.fn(),
  },
}));

const mockUser = { id: "user-client", name: "Client User", role: "CLIENT" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@/store/useNotificationStore", () => ({
  useNotificationStore: () => ({}),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) => {
      const parts = key.split(".");
      let current: unknown = enTranslations;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      if (typeof current === "string") {
        if (options && typeof options === "object") {
          let res = current;
          for (const k of Object.keys(options)) {
            res = res.replace(`{{${k}}}`, String(options[k]));
          }
          return res;
        }
        return current;
      }
      return key;
    },
    i18n: {},
  }),
}));

const activeSubscription = {
  id: "sub-1",
  client_id: "user-client",
  service_name: "Managed Backup",
  plan: "BASIC",
  status: "ACTIVE",
  renewal_date: "2026-12-01T00:00:00.000Z",
  equipment_count: 5,
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("ResourcesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUser.role = "CLIENT";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("auto-filters by the client's active subscription plan", async () => {
    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSubscription]);

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("MSP Backup Agent – Windows")).toBeInTheDocument();
    expect(screen.getByText("Basic Plan: Remote Support Handbook")).toBeInTheDocument();
    expect(screen.queryByText("Security & vCIO Reviews Whitepaper")).toBeNull();
    expect(screen.queryByText("Network Monitoring Setup Manual")).toBeNull();
  });

  test("client can manually switch the plan filter", async () => {
    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSubscription]);

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("MSP Backup Agent – Windows");

    const select = screen.getByLabelText("Plan");
    fireEvent.change(select, { target: { value: "PL-003" } });

    await waitFor(() => {
      expect(screen.getByText("Security & vCIO Reviews Whitepaper")).toBeInTheDocument();
    });
    expect(screen.getByText("Network Monitoring Setup Manual")).toBeInTheDocument();
    expect(screen.queryByText("Basic Plan: Remote Support Handbook")).toBeNull();
  });

  test("admin sees all resources by default with the All Plans option", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("MSP Backup Agent – Windows")).toBeInTheDocument();
    expect(screen.getByText("Basic Plan: Remote Support Handbook")).toBeInTheDocument();
    expect(screen.getByText("Security & vCIO Reviews Whitepaper")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan")).toHaveValue("ALL");
    expect(screen.getByRole("option", { name: "All Plans" })).toBeInTheDocument();
  });

  test("search narrows the resource list", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("MSP Backup Agent – Windows");

    const search = screen.getByPlaceholderText("Search resources...");
    fireEvent.change(search, { target: { value: "whitepaper" } });

    await waitFor(() => {
      expect(screen.getByText("Security & vCIO Reviews Whitepaper")).toBeInTheDocument();
    });
    expect(screen.queryByText("MSP Backup Agent – Windows")).toBeNull();
  });

  test("shows an empty state when nothing matches", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("MSP Backup Agent – Windows");

    const search = screen.getByPlaceholderText("Search resources...");
    fireEvent.change(search, { target: { value: "zzzz-no-match" } });

    expect(await screen.findByText("No resources found")).toBeInTheDocument();
  });

  test("download triggers the file download and a success toast", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("MSP Backup Agent – Windows");

    const downloadButtons = screen.getAllByRole("button", { name: "Download" });
    fireEvent.click(downloadButtons[0]);

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith("Download Started", {
      description: "Downloading msp-backup-agent-windows.exe",
    });
  });
});
