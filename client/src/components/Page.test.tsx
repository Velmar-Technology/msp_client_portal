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
});
