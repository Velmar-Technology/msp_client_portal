import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MaintenancePage from "./MaintenancePage";

const mockSetCurrentDate = vi.fn();
const mockSetViewMode = vi.fn();
const mockOpenScheduleModal = vi.fn();
const mockCloseScheduleModal = vi.fn();
const mockHandleScheduleSuccess = vi.fn();
const mockHandleStatusChange = vi.fn();
const mockSetStatusFilter = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetSelectedTechFilter = vi.fn();
const mockSetListPage = vi.fn();
const mockHandleListLimitChange = vi.fn();
const mockHandleSearchChange = vi.fn();
const mockHandleStatusFilterChangeForList = vi.fn();
const mockHandleTechFilterChange = vi.fn();

const mockMaintenance = {
  id: "maint-1",
  equipment_id: "eq-1",
  title: "Routine Patching",
  description: "Update Windows patches",
  scheduled_date: "2026-09-17T14:00:00Z",
  status: "SCHEDULED" as const,
  device_name: "Workstation 01",
  device_serial: "SN-998811",
  client_name: "Acme Corp",
  assigned_tech_name: "Alice Tech",
  notes: "Reboot required",
};

let mockHookState: any = {};

vi.mock("../hooks/useMaintenance", () => ({
  useMaintenance: () => mockHookState,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "tech-1", role: "TECHNICIAN", name: "Alice Tech" },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.maintenance": "Maintenance Schedule",
        "maintenance.subtitle": "Plan, coordinate, and review endpoint maintenance tasks",
        "maintenance.scheduleBtn": "Schedule Maintenance",
        "maintenance.viewCalendar": "Calendar",
        "maintenance.viewList": "List",
        "maintenance.searchPlaceholder": "Search tasks...",
        "maintenance.filterAllStatuses": "All Statuses",
        "maintenance.statusScheduled": "Scheduled",
        "maintenance.statusInProgress": "In Progress",
        "maintenance.statusCompleted": "Completed",
        "maintenance.statusOverdue": "Overdue",
        "maintenance.statusCancelled": "Cancelled",
        "maintenance.filterAllTechs": "All Technicians",
        "maintenance.viewDetails": "View Details",
        "maintenance.tableDevice": "Device",
        "maintenance.tableTech": "Technician",
        "maintenance.tableClient": "Client",
        "devices.wizardStep3SerialNumber": "Serial Number",
        "devices.unnamedDevice": "Unnamed Device",
        "maintenance.noMaintenancesFound": "No scheduled maintenance found",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("../components/ScheduleMaintenanceModal", () => ({
  ScheduleMaintenanceModal: () => <div data-testid="mock-schedule-modal" />,
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <MaintenancePage />
    </MemoryRouter>
  );
}

describe("MaintenancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      currentDate: new Date("2026-09-17T12:00:00Z"),
      setCurrentDate: mockSetCurrentDate,
      viewMode: "CALENDAR",
      setViewMode: mockSetViewMode,
      maintenances: [mockMaintenance],
      filteredMaintenances: [mockMaintenance],
      paginatedMaintenances: [mockMaintenance],
      allEquipment: [],
      loading: false,
      statusFilter: "ALL",
      setStatusFilter: mockSetStatusFilter,
      searchQuery: "",
      setSearchQuery: mockSetSearchQuery,
      selectedTechFilter: "ALL",
      setSelectedTechFilter: mockSetSelectedTechFilter,
      listPage: 1,
      setListPage: mockSetListPage,
      listLimit: 10,
      handleListLimitChange: mockHandleListLimitChange,
      listTotalPages: 1,
      isModalOpen: false,
      selectedEquipForModal: null,
      openScheduleModal: mockOpenScheduleModal,
      closeScheduleModal: mockCloseScheduleModal,
      handleScheduleSuccess: mockHandleScheduleSuccess,
      handleStatusChange: mockHandleStatusChange,
      handleSearchChange: mockHandleSearchChange,
      handleStatusFilterChangeForList: mockHandleStatusFilterChangeForList,
      handleTechFilterChange: mockHandleTechFilterChange,
      isAdminOrTech: true,
      uniqueTechnicians: [{ id: "tech-1", name: "Alice Tech" }],
      getStatusBadge: () => <span>Scheduled</span>,
    };
  });

  it("renders the Page ControlPanel with title and actions", () => {
    renderComponent();

    expect(screen.getByText("Maintenance Schedule")).toBeInTheDocument();
    expect(
      screen.getByText("Plan, coordinate, and review endpoint maintenance tasks")
    ).toBeInTheDocument();
    expect(screen.getByText("Schedule Maintenance")).toBeInTheDocument();
  });

  it("renders Calendar view with Page.Date and events", () => {
    renderComponent();

    // Renders the event on the calendar
    expect(screen.getByText("Workstation 01")).toBeInTheDocument();

    // Clicking schedule maintenance opens modal
    const scheduleBtn = screen.getByRole("button", { name: /Schedule Maintenance/i });
    fireEvent.click(scheduleBtn);
    expect(mockOpenScheduleModal).toHaveBeenCalled();
  });

  it("switches to list view when view switcher is toggled", () => {
    renderComponent();

    const listBtn = screen.getByRole("button", { name: "List" });
    fireEvent.click(listBtn);
    expect(mockSetViewMode).toHaveBeenCalledWith("LIST");
  });

  it("renders list view with DataTable when viewMode is LIST", () => {
    mockHookState.viewMode = "LIST";
    renderComponent();

    expect(screen.getByText("Routine Patching")).toBeInTheDocument();
  });
});
