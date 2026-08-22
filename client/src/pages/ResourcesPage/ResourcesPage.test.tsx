import "@testing-library/jest-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ResourcesPage } from "./ResourcesPage";
import { subscriptionService, type Subscription } from "@/services/subscriptionService";
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

const mockT = (key: string, options?: Record<string, string | number>) => {
  const parts = key.split(".");
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
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
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: "en_US",
      changeLanguage: () => Promise.resolve(),
    },
  }),
}));

const activeSubscription: Subscription = {
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
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
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

    expect(await screen.findByText("Nextcloud Desktop Client")).toBeInTheDocument();
    expect(screen.getByText("Rustdesk Desktop Client")).toBeInTheDocument();
    expect(screen.getByText("RMM Agent")).toBeInTheDocument();
  });

  test("client can view resources", async () => {
    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSubscription]);

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Nextcloud Desktop Client")).toBeInTheDocument();
  });

  test("admin sees all resources by default", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Nextcloud Desktop Client")).toBeInTheDocument();
    expect(screen.getByText("Rustdesk Desktop Client")).toBeInTheDocument();
    expect(screen.getByText("RMM Agent")).toBeInTheDocument();
  });

  test("search narrows the resource list", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("Nextcloud Desktop Client");

    const search = screen.getByPlaceholderText("Search resources...");
    fireEvent.change(search, { target: { value: "Rustdesk" } });

    await waitFor(() => {
      expect(screen.getByText("Rustdesk Desktop Client")).toBeInTheDocument();
    });
    expect(screen.queryByText("Nextcloud Desktop Client")).toBeNull();
  });

  test("shows an empty state when nothing matches", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("Nextcloud Desktop Client");

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

    await screen.findByText("Nextcloud Desktop Client");

    const downloadButtons = screen.getAllByRole("button", { name: "Download" });
    fireEvent.click(downloadButtons[0]);

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith("Download Started", {
      description: "Downloading Nextcloud-34.0.0-x64.msi",
    });
  });

  test("allows filtering resources by operating system dropdown", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("Nextcloud Desktop Client");
    expect(screen.getByText("Rustdesk Desktop Client")).toBeInTheDocument();

    const osSelect = screen.getByLabelText("OS");
    fireEvent.click(osSelect);

    const option = await screen.findByRole("option", { name: "Linux" });
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.queryByText("Nextcloud Desktop Client")).toBeNull();
    });
  });

  test("toggles between tiled and list view modes", async () => {
    mockUser.role = "ADMIN";

    render(
      <MemoryRouter>
        <ResourcesPage />
      </MemoryRouter>
    );

    await screen.findByText("Nextcloud Desktop Client");

    const listBtn = screen.getByRole("button", { name: "List" });
    fireEvent.click(listBtn);

    expect(screen.getByText("Nextcloud Desktop Client")).toBeInTheDocument();

    const tiledBtn = screen.getByRole("button", { name: "Tiled" });
    fireEvent.click(tiledBtn);

    expect(screen.getByText("Nextcloud Desktop Client")).toBeInTheDocument();
  });
});
