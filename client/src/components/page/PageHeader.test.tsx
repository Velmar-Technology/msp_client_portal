import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Page } from "../Page";
import { Button } from "@/components/ui/button";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

// Mock dropdown-menu for JSDOM
vi.mock("@/components/ui/dropdown-menu", () => {
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown">{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown-trigger">{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown-content">{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick,
      disabled,
      className,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      className?: string;
    }) => (
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={onClick}
        className={className}
      >
        {children}
      </button>
    ),
  };
});


describe("PageHeader and Compound Slots", () => {
  it("renders header with TitleGroup, Title, Description, and Back button", () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter>
        <Page>
          <Page.Header>
            <Page.HeaderRow>
              <Page.TitleGroup>
                <Page.Back onClick={handleBack} />
                <Page.Title>Tickets Management</Page.Title>
                <Page.Description>Triage client issues</Page.Description>
              </Page.TitleGroup>
            </Page.HeaderRow>
          </Page.Header>
        </Page>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tickets Management");
    expect(screen.getByText("Triage client issues")).toBeInTheDocument();
    const backBtn = screen.getByRole("button", { name: "Back" });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("applies sticky glassmorphism classes when sticky={true}", () => {
    render(
      <MemoryRouter>
        <Page>
          <Page.Header sticky data-testid="sticky-header">
            <Page.Title>Sticky Page</Page.Title>
          </Page.Header>
        </Page>
      </MemoryRouter>
    );

    const header = screen.getByTestId("sticky-header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("z-20");
    expect(header).toHaveClass("backdrop-blur-md");
  });

  it("renders all actions directly when count <= maxVisible", () => {
    render(
      <MemoryRouter>
        <Page.Actions maxVisible={3}>
          <Button size="sm">Action 1</Button>
          <Button size="sm">Action 2</Button>
          <Button size="sm">Action 3</Button>
        </Page.Actions>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Action 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action 3" })).toBeInTheDocument();
    expect(screen.queryByLabelText("More actions")).not.toBeInTheDocument();
  });

  it("collapses excess actions into a dropdown menu when count > maxVisible", () => {
    const handleAction4 = vi.fn();
    render(
      <MemoryRouter>
        <Page.Actions maxVisible={2}>
          <Button size="sm">Action 1</Button>
          <Button size="sm">Action 2</Button>
          <Button size="sm">Action 3</Button>
          <Button size="sm" onClick={handleAction4}>Action 4</Button>
        </Page.Actions>
      </MemoryRouter>
    );

    // Primary actions are visible
    expect(screen.getByRole("button", { name: "Action 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action 2" })).toBeInTheDocument();

    // Secondary actions are hidden behind overflow trigger
    expect(screen.queryByRole("button", { name: "Action 3" })).not.toBeInTheDocument();
    const overflowTrigger = screen.getByLabelText("More actions");
    expect(overflowTrigger).toBeInTheDocument();

    // Clicking overflow trigger opens dropdown
    fireEvent.click(overflowTrigger);

    const item4 = screen.getByText("Action 4");
    expect(item4).toBeInTheDocument();
    fireEvent.click(item4);
    expect(handleAction4).toHaveBeenCalledTimes(1);
  });

  it("renders PageToolbar with filters and controls slots", () => {
    render(
      <MemoryRouter>
        <Page>
          <Page.Header>
            <Page.Toolbar>
              <Page.Filters>
                <div data-testid="filter-slot">Filter Pills</div>
              </Page.Filters>
              <Page.Controls>
                <div data-testid="control-slot">Page 1 of 5</div>
              </Page.Controls>
            </Page.Toolbar>
          </Page.Header>
        </Page>
      </MemoryRouter>
    );

    expect(screen.getByTestId("filter-slot")).toHaveTextContent("Filter Pills");
    expect(screen.getByTestId("control-slot")).toHaveTextContent("Page 1 of 5");
  });

  it("composes seamlessly with Page.Tabs and Page.View", () => {
    render(
      <MemoryRouter>
        <Page activeView="list">
          <Page.Header>
            <Page.HeaderRow>
              <Page.TitleGroup>
                <Page.Title>Tabs Composed Page</Page.Title>
              </Page.TitleGroup>
            </Page.HeaderRow>
            <Page.Tabs defaultTab="tab1">
              <Page.Tab id="tab1" label="Tab One">
                <div data-testid="tab1-body">Tab One Content</div>
              </Page.Tab>
              <Page.Tab id="tab2" label="Tab Two">
                <div data-testid="tab2-body">Tab Two Content</div>
              </Page.Tab>
            </Page.Tabs>
          </Page.Header>

          <Page.View type="list">
            <div data-testid="list-view-content">List View Data</div>
          </Page.View>
        </Page>
      </MemoryRouter>
    );

    expect(screen.getByText("Tabs Composed Page")).toBeInTheDocument();
    expect(screen.getByText("Tab One")).toBeInTheDocument();
    expect(screen.getByTestId("tab1-body")).toHaveTextContent("Tab One Content");
    expect(screen.getByTestId("list-view-content")).toHaveTextContent("List View Data");
  });
});
