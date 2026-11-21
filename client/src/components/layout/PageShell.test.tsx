import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PageShell } from "./PageShell";
import { Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

describe("PageShell Layout Component", () => {
  it("renders title, subtitle, and badge", () => {
    render(
      <MemoryRouter>
        <PageShell
          title="Account Settings"
          subtitle="Manage your personal preferences and credentials"
          badge={<span data-testid="test-badge">Beta</span>}
        >
          <div>Content Body</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.getByText("Account Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage your personal preferences and credentials")).toBeInTheDocument();
    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
    expect(screen.getByText("Content Body")).toBeInTheDocument();
  });

  it("renders back button and triggers callback on click", () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter>
        <PageShell title="Detail Page" onBack={handleBack}>
          <div>Inner content</div>
        </PageShell>
      </MemoryRouter>
    );

    const backBtn = screen.getByRole("button", { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("renders CTA and action slots", () => {
    render(
      <MemoryRouter>
        <PageShell
          title="Overview"
          cta={<Button>Primary Action</Button>}
          actions={<Button variant="outline">Secondary Filter</Button>}
        >
          <div>Main View</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Primary Action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary Filter" })).toBeInTheDocument();
  });

  it("renders horizontal navigation tabs and handles tab selection", () => {
    const handleTabChange = vi.fn();
    const tabs = [
      { id: "general", label: "General", icon: Settings },
      { id: "security", label: "Security", icon: Shield },
    ];

    render(
      <MemoryRouter>
        <PageShell
          title="Settings"
          tabs={tabs}
          defaultTab="general"
          onTabChange={handleTabChange}
        >
          <div>Settings Content</div>
        </PageShell>
      </MemoryRouter>
    );

    const generalTab = screen.getByRole("tab", { name: /general/i });
    const securityTab = screen.getByRole("tab", { name: /security/i });

    expect(generalTab).toBeInTheDocument();
    expect(securityTab).toBeInTheDocument();
    expect(generalTab).toHaveAttribute("aria-selected", "true");
    expect(securityTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(securityTab);
    expect(handleTabChange).toHaveBeenCalledWith("security");
    expect(securityTab).toHaveAttribute("aria-selected", "true");
  });

  it("applies width variant classes correctly", () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <PageShell title="Constrained" variant="constrained">
          <div>Content</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(container.querySelector(".max-w-4xl")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PageShell title="Narrow" variant="narrow">
          <div>Content</div>
        </PageShell>
      </MemoryRouter>
    );
    expect(container.querySelector(".max-w-3xl")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PageShell title="Full" variant="full">
          <div>Content</div>
        </PageShell>
      </MemoryRouter>
    );
    expect(container.querySelector(".max-w-full")).toBeInTheDocument();
  });
});
