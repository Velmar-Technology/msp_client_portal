import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ApiStatusPage } from "./ApiStatusPage";

const mockRefresh = vi.fn();
const mockSetActiveSection = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetStatusTab = vi.fn();
const mockSetCategoryFilter = vi.fn();
const mockSetLatencyFilter = vi.fn();
const mockSetEnvSearchQuery = vi.fn();
const mockSetEnvStatusTab = vi.fn();
const mockSetEnvCategoryFilter = vi.fn();
const mockSetEnvSensitivityFilter = vi.fn();
const mockSetIsAutoRefresh = vi.fn();

const mockServices = [
  {
    name: "Auth Service",
    category: "CORE",
    endpoint: "/api/v1/auth",
    status: "OPERATIONAL" as const,
    latencyMs: 25,
    uptimePercentage: 99.9,
  },
  {
    name: "Billing Service",
    category: "BUSINESS",
    endpoint: "/api/v1/invoices",
    status: "DEGRADED" as const,
    latencyMs: 145,
    uptimePercentage: 98.5,
  },
];

const mockEnvVars = [
  {
    key: "DATABASE_URL",
    category: "DATABASE",
    status: "CONFIGURED" as const,
    valueDisplay: "postgres://****:****@localhost:5432/msp",
    description: "Primary database connection",
    isSecret: true,
    isRequired: true,
  },
];

let mockHookState: any = {};

vi.mock("../hooks/useApiStatus", () => ({
  useApiStatus: () => mockHookState,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <ApiStatusPage />
    </MemoryRouter>
  );
}

describe("ApiStatusPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      data: {
        totalServices: 2,
        operationalCount: 1,
        degradedCount: 1,
        downCount: 0,
        averageLatencyMs: 85,
        envTotal: 1,
        envConfiguredCount: 1,
        envPlaceholderCount: 0,
        envMissingCount: 0,
        services: mockServices,
        envVariables: mockEnvVars,
      },
      isLoading: false,
      isRefreshing: false,
      activeSection: "SERVICES",
      setActiveSection: mockSetActiveSection,
      searchQuery: "",
      setSearchQuery: mockSetSearchQuery,
      statusTab: "ALL",
      setStatusTab: mockSetStatusTab,
      categoryFilter: "ALL",
      setCategoryFilter: mockSetCategoryFilter,
      latencyFilter: "ALL",
      setLatencyFilter: mockSetLatencyFilter,
      envSearchQuery: "",
      setEnvSearchQuery: mockSetEnvSearchQuery,
      envStatusTab: "ALL",
      setEnvStatusTab: mockSetEnvStatusTab,
      envCategoryFilter: "ALL",
      setEnvCategoryFilter: mockSetEnvCategoryFilter,
      envSensitivityFilter: "ALL",
      setEnvSensitivityFilter: mockSetEnvSensitivityFilter,
      isAutoRefresh: true,
      setIsAutoRefresh: mockSetIsAutoRefresh,
      filteredServices: mockServices,
      paginatedServices: mockServices,
      servicesPage: 1,
      setServicesPage: vi.fn(),
      servicesLimit: 10,
      setServicesLimit: vi.fn(),
      servicesTotalPages: 1,
      filteredEnvVariables: mockEnvVars,
      paginatedEnvVariables: mockEnvVars,
      envVarsPage: 1,
      setEnvVarsPage: vi.fn(),
      envVarsLimit: 10,
      setEnvVarsLimit: vi.fn(),
      envVarsTotalPages: 1,
      refresh: mockRefresh,
    };
  });

  it("renders page title, subtitle, refresh button, and bubble tabs", () => {
    renderComponent();

    expect(screen.getByText("System & API Health Status")).toBeInTheDocument();
    expect(screen.getByText("Real-time microservices latency, uptime, and environment audit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByText("API Microservices")).toBeInTheDocument();
    expect(screen.getByText("Environment Variables")).toBeInTheDocument();
  });

  it("renders microservices KPI cards and table items", () => {
    renderComponent();

    expect(screen.getByText("Total Services")).toBeInTheDocument();
    expect(screen.getByText("Auth Service")).toBeInTheDocument();
    expect(screen.getByText("/api/v1/auth")).toBeInTheDocument();
    expect(screen.getByText("Billing Service")).toBeInTheDocument();
  });

  it("switches section to Environment Variables when bubble tab clicked", () => {
    renderComponent();

    const envTab = screen.getByRole("tab", { name: /Environment Variables/i });
    fireEvent.click(envTab);
    expect(mockSetActiveSection).toHaveBeenCalledWith("ENV_VARS");
  });

  it("renders empty state card when no microservices match filters", () => {
    mockHookState.filteredServices = [];
    mockHookState.paginatedServices = [];
    mockHookState.searchQuery = "nonexistent";

    renderComponent();

    expect(screen.getByText("No microservices match filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });
});
