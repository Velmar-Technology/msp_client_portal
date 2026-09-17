import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Page } from "./Page";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

// Mock Breadcrumbs to keep tests clean
vi.mock("@/components/layout/Breadcrumbs", () => ({
  Breadcrumbs: () => <nav data-testid="mock-breadcrumbs">Breadcrumbs</nav>,
}));

describe("Page component (Enterprise Odoo View System)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("Legacy Compatibility Mode", () => {
    it("renders title, subtitle, actions, breadcrumbs, and children", () => {
      render(
        <MemoryRouter>
          <Page
            title="Ticket Management"
            subtitle="Manage client issues"
            actions={<button type="button">New Ticket</button>}
          >
            <div data-testid="page-body">Body Content</div>
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByText("Ticket Management")).toBeInTheDocument();
      expect(screen.getByText("Manage client issues")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New Ticket" })).toBeInTheDocument();
      expect(screen.getByTestId("mock-breadcrumbs")).toBeInTheDocument();
      expect(screen.getByTestId("page-body")).toHaveTextContent("Body Content");
    });

    it("renders cleanly when title and actions are omitted", () => {
      render(
        <MemoryRouter>
          <Page showBreadcrumbs={false}>
            <div data-testid="simple-body">Standalone Page</div>
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByTestId("simple-body")).toBeInTheDocument();
      expect(screen.queryByTestId("mock-breadcrumbs")).not.toBeInTheDocument();
    });
  });

  describe("Compound View Architecture", () => {
    it("renders ControlPanel with Search, ViewSwitcher, and Pager", () => {
      render(
        <MemoryRouter>
          <Page defaultView="list" totalCount={100} defaultPage={1} defaultPageSize={25}>
            <Page.ControlPanel
              title="Equipment Devices"
              subtitle="Physical and virtual endpoints"
              showBreadcrumbs={false}
            />
            <Page.View type="list">
              <div data-testid="list-view">List View Content</div>
            </Page.View>
            <Page.View type="kanban">
              <div data-testid="kanban-view">Kanban View Content</div>
            </Page.View>
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByText("Equipment Devices")).toBeInTheDocument();
      expect(screen.getByTestId("list-view")).toBeInTheDocument();
      expect(screen.queryByTestId("kanban-view")).not.toBeInTheDocument();

      // Pager should show 1-25 / 100
      expect(screen.getByText("1-25")).toBeInTheDocument();
      expect(screen.getByText("/ 100")).toBeInTheDocument();
    });

    it("switches views dynamically between List and Kanban", () => {
      render(
        <MemoryRouter>
          <Page defaultView="list">
            <Page.ControlPanel showBreadcrumbs={false} />
            <Page.View type="list">
              <div data-testid="view-table">Table Data</div>
            </Page.View>
            <Page.View type="kanban">
              <div data-testid="view-cards">Card Data</div>
            </Page.View>
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByTestId("view-table")).toBeInTheDocument();
      expect(screen.queryByTestId("view-cards")).not.toBeInTheDocument();

      // Click Kanban view button
      const kanbanBtn = screen.getByRole("button", { name: /kanban/i });
      fireEvent.click(kanbanBtn);

      expect(screen.queryByTestId("view-table")).not.toBeInTheDocument();
      expect(screen.getByTestId("view-cards")).toBeInTheDocument();
    });

    it("handles search input typing and clear button", () => {
      vi.useFakeTimers();

      render(
        <MemoryRouter>
          <Page>
            <Page.ControlPanel showBreadcrumbs={false} />
          </Page>
        </MemoryRouter>
      );

      const searchInput = screen.getByRole("textbox");
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "Workstation" } });
      expect(searchInput).toHaveValue("Workstation");

      // Advance debounce timer
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Clear button should be visible
      const clearBtn = screen.getByRole("button", { name: /clear search/i });
      expect(clearBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(clearBtn);
      });
      expect(searchInput).toHaveValue("");
    });

    it("handles pager navigation forward and backward", () => {
      const handlePageChange = vi.fn();

      render(
        <Page.Pager
          page={1}
          pageSize={20}
          totalCount={50}
          onPageChange={handlePageChange}
        />
      );

      expect(screen.getByText("1-20")).toBeInTheDocument();
      expect(screen.getByText("/ 50")).toBeInTheDocument();

      const prevBtn = screen.getByRole("button", { name: /previous page/i });
      const nextBtn = screen.getByRole("button", { name: /next page/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();

      fireEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(2);
    });

    it("renders StatusBar with stage pipeline and actions", () => {
      const handleStageSelect = vi.fn();

      render(
        <Page.StatusBar
          actions={<button type="button">Resolve Ticket</button>}
          currentStageId="open"
          onStageSelect={handleStageSelect}
          stages={[
            { id: "new", label: "New", isCompleted: true },
            { id: "open", label: "Open", isCurrent: true },
            { id: "resolved", label: "Resolved" },
          ]}
        />
      );

      expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("Resolved")).toBeInTheDocument();

      const resolvedBtn = screen.getByRole("button", { name: "Resolved" });
      fireEvent.click(resolvedBtn);
      expect(handleStageSelect).toHaveBeenCalledWith("resolved");
    });
  });

  describe("Odoo Form View Architecture", () => {
    it("renders Page.Sheet and Page.Form with elevation and content", () => {
      render(
        <Page.Sheet maxWidth="5xl" elevation="sm" data-testid="form-sheet">
          <div>Sheet Content Inside Record</div>
        </Page.Sheet>
      );

      const sheet = screen.getByTestId("form-sheet");
      expect(sheet).toBeInTheDocument();
      expect(sheet).toHaveTextContent("Sheet Content Inside Record");
      expect(sheet).toHaveClass("max-w-5xl");
    });

    it("renders Page.FormHeader with title, subtitle, badges, and StatBox", () => {
      const handleStatClick = vi.fn();

      render(
        <MemoryRouter>
          <Page.FormHeader
            title="Ticket #1042 - Network Failure"
            subtitle="Opened by Acme Corp • 2 hours ago"
            badges={<span data-testid="badge-open">OPEN</span>}
            buttonBox={
              <Page.StatBox>
                <Page.StatButton
                  value={4}
                  label="Replies"
                  onClick={handleStatClick}
                  data-testid="stat-replies"
                />
              </Page.StatBox>
            }
          />
        </MemoryRouter>
      );

      expect(screen.getByText("Ticket #1042 - Network Failure")).toBeInTheDocument();
      expect(screen.getByText("Opened by Acme Corp • 2 hours ago")).toBeInTheDocument();
      expect(screen.getByTestId("badge-open")).toBeInTheDocument();

      const statBtn = screen.getByTestId("stat-replies");
      expect(statBtn).toBeInTheDocument();
      expect(statBtn).toHaveTextContent("4");
      expect(statBtn).toHaveTextContent("Replies");

      fireEvent.click(statBtn);
      expect(handleStatClick).toHaveBeenCalledTimes(1);
    });

    it("renders Page.Notebook and switches between tabs", () => {
      const handleTabChange = vi.fn();

      render(
        <MemoryRouter>
          <Page.Notebook defaultTab="tab1" onTabChange={handleTabChange}>
            <Page.NotebookTab id="tab1" label="Overview" badge="1">
              <div data-testid="tab1-content">Overview Content</div>
            </Page.NotebookTab>
            <Page.NotebookTab id="tab2" label="Diagnostics" badge="3">
              <div data-testid="tab2-content">Diagnostics Telemetry</div>
            </Page.NotebookTab>
          </Page.Notebook>
        </MemoryRouter>
      );

      expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /diagnostics/i })).toBeInTheDocument();
      expect(screen.getByTestId("tab1-content")).toBeInTheDocument();
      expect(screen.queryByTestId("tab2-content")).not.toBeInTheDocument();

      // Click second tab
      const tab2Trigger = screen.getByRole("tab", { name: /diagnostics/i });
      fireEvent.click(tab2Trigger);

      expect(handleTabChange).toHaveBeenCalledWith("tab2");
      expect(screen.queryByTestId("tab1-content")).not.toBeInTheDocument();
      expect(screen.getByTestId("tab2-content")).toBeInTheDocument();
    });

    it("renders Page.FieldGroup and Page.Field in multi-column layout", () => {
      render(
        <Page.FieldGroup title="General Information" cols={2}>
          <Page.Field label="Customer" data-testid="field-customer">
            <span>Acme Industries</span>
          </Page.Field>
          <Page.Field label="Priority" data-testid="field-priority">
            <span>High</span>
          </Page.Field>
        </Page.FieldGroup>
      );

      expect(screen.getByText("General Information")).toBeInTheDocument();
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Acme Industries")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });
  });

  describe("Dashboard, Calendar, and Graph Views", () => {
    it("renders Page.Dashboard and Page.DashboardKpi with trend and click handler", () => {
      const handleKpiClick = vi.fn();

      render(
        <Page.Dashboard cols={2} data-testid="dashboard-grid">
          <Page.DashboardKpi
            title="Open Tickets"
            value={42}
            subtitle="vs last month"
            trend={{ value: "+12%", direction: "up", isPositive: true }}
            onClick={handleKpiClick}
            data-testid="kpi-open-tickets"
          />
          <Page.DashboardKpi
            title="Average Resolution Time"
            value="3.2 hrs"
            trend={{ value: "-15%", direction: "down", isPositive: true }}
          />
        </Page.Dashboard>
      );

      expect(screen.getByTestId("dashboard-grid")).toBeInTheDocument();
      expect(screen.getByText("Open Tickets")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("+12%")).toBeInTheDocument();
      expect(screen.getByText("vs last month")).toBeInTheDocument();
      expect(screen.getByText("Average Resolution Time")).toBeInTheDocument();
      expect(screen.getByText("3.2 hrs")).toBeInTheDocument();

      const kpiCard = screen.getByTestId("kpi-open-tickets");
      fireEvent.click(kpiCard);
      expect(handleKpiClick).toHaveBeenCalledTimes(1);
    });

    it("renders Page.Calendar and displays days and event markers", () => {
      const handleEventClick = vi.fn();
      const testDate = new Date(2026, 8, 15); // Sep 15, 2026

      render(
        <Page.Calendar
          currentDate={testDate}
          events={[
            {
              id: "evt-1",
              title: "Server Patching Window",
              date: testDate,
              variant: "warning",
            },
          ]}
          onEventClick={handleEventClick}
        />
      );

      expect(screen.getByText("September 2026")).toBeInTheDocument();
      expect(screen.getByText("Server Patching Window")).toBeInTheDocument();

      const eventBtn = screen.getByRole("button", { name: "Server Patching Window" });
      fireEvent.click(eventBtn);
      expect(handleEventClick).toHaveBeenCalledTimes(1);
    });

    it("renders Page.Graph and switches between Bar, Line, and Donut charts", () => {
      const graphData = [
        { label: "Hardware", value: 30 },
        { label: "Network", value: 45 },
        { label: "Software", value: 25 },
      ];

      render(
        <Page.Graph
          title="Ticket Distribution by Category"
          subtitle="Past 30 days"
          data={graphData}
          defaultType="bar"
        />
      );

      expect(screen.getByText("Ticket Distribution by Category")).toBeInTheDocument();
      expect(screen.getByText("Past 30 days")).toBeInTheDocument();
      expect(screen.getAllByText("Hardware")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Network")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Software")[0]).toBeInTheDocument();

      // Switch to Line chart
      const lineBtn = screen.getByRole("button", { name: /line chart/i });
      fireEvent.click(lineBtn);
      expect(screen.getByRole("button", { name: /line chart/i })).toBeInTheDocument();

      // Switch to Donut chart
      const donutBtn = screen.getByRole("button", { name: /donut chart/i });
      fireEvent.click(donutBtn);
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  describe("Tabs Support", () => {
    it("renders Page.Tabs and Page.Tab compound components and switches tabs", () => {
      const handleTabChange = vi.fn();

      render(
        <MemoryRouter>
          <Page.Tabs defaultTab="general" onTabChange={handleTabChange}>
            <Page.Tab id="general" label="General Settings">
              <div data-testid="tab-general-content">General Settings Content</div>
            </Page.Tab>
            <Page.Tab id="security" label="Security Settings">
              <div data-testid="tab-security-content">Security Settings Content</div>
            </Page.Tab>
          </Page.Tabs>
        </MemoryRouter>
      );

      // Verify active tab content rendered
      expect(screen.getByText("General Settings")).toBeInTheDocument();
      expect(screen.getByTestId("tab-general-content")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-security-content")).not.toBeInTheDocument();

      // Click on Security tab
      fireEvent.click(screen.getByRole("tab", { name: "Security Settings" }));
      expect(handleTabChange).toHaveBeenCalledWith("security");
      expect(screen.getByTestId("tab-security-content")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-general-content")).not.toBeInTheDocument();
    });

    it("renders Page.Tabs using tabs array prop and variant default", () => {
      const handleTabChange = vi.fn();
      const tabItems = [
        { id: "overview", label: "Overview", content: <div data-testid="tab-overview">Overview Data</div> },
        { id: "telemetry", label: "Telemetry", content: <div data-testid="tab-telemetry">Telemetry Data</div> },
      ];

      render(
        <MemoryRouter>
          <Page.Tabs
            tabs={tabItems}
            defaultTab="overview"
            variant="default"
            onTabChange={handleTabChange}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId("tab-overview")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-telemetry")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Telemetry" }));
      expect(handleTabChange).toHaveBeenCalledWith("telemetry");
      expect(screen.getByTestId("tab-telemetry")).toBeInTheDocument();
    });

    it("renders Page with top-level tabs prop under the header", () => {
      const handleTabChange = vi.fn();
      const tabs = [
        { id: "active", label: "Active Tickets" },
        { id: "archived", label: "Archived Tickets" },
      ];

      render(
        <MemoryRouter>
          <Page
            title="Tickets"
            subtitle="Client support tickets"
            tabs={tabs}
            defaultTab="active"
            onTabChange={handleTabChange}
          >
            <div data-testid="page-child-body">Tickets List Body</div>
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByText("Tickets")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Active Tickets" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Archived Tickets" })).toBeInTheDocument();
      expect(screen.getByTestId("page-child-body")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Archived Tickets" }));
      expect(handleTabChange).toHaveBeenCalledWith("archived");
    });

    it("renders Page.ControlPanel with tabsSlot", () => {
      render(
        <MemoryRouter>
          <Page>
            <Page.ControlPanel
              title="System Preferences"
              showBreadcrumbs={false}
              tabsSlot={<div data-testid="custom-tabs-slot">Custom Tab Bar</div>}
            />
          </Page>
        </MemoryRouter>
      );

      expect(screen.getByText("System Preferences")).toBeInTheDocument();
      expect(screen.getByTestId("custom-tabs-slot")).toHaveTextContent("Custom Tab Bar");
    });
  });
});
