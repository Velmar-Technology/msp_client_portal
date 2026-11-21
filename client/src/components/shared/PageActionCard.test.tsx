import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Wrench } from "lucide-react";
import { PageActionCard, PageActionGrid } from "./PageActionCard";

describe("PageActionCard & PageActionGrid", () => {
  it("renders button card with icon, title, and description", () => {
    const handleClick = vi.fn();

    render(
      <PageActionCard
        icon={Wrench}
        title="Add webhook tool"
        description="Configure HTTP endpoints"
        onClick={handleClick}
      />
    );

    expect(screen.getByText("Add webhook tool")).toBeInTheDocument();
    expect(screen.getByText("Configure HTTP endpoints")).toBeInTheDocument();

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders router Link when 'to' prop is provided", () => {
    render(
      <MemoryRouter>
        <PageActionCard
          title="Add client tool"
          to="/tools/client/new"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/tools/client/new");
    expect(screen.getByText("Add client tool")).toBeInTheDocument();
  });

  it("renders anchor when 'href' prop is provided", () => {
    render(
      <PageActionCard
        title="External docs"
        href="https://example.com/docs"
      />
    );

    const anchor = screen.getByRole("link");
    expect(anchor).toHaveAttribute("href", "https://example.com/docs");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("disables interaction when disabled={true}", () => {
    const handleClick = vi.fn();

    render(
      <PageActionCard
        title="Disabled Action"
        onClick={handleClick}
        disabled
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders grid container with children", () => {
    render(
      <PageActionGrid data-testid="grid-container">
        <PageActionCard title="Action 1" />
        <PageActionCard title="Action 2" />
      </PageActionGrid>
    );

    expect(screen.getByTestId("grid-container")).toBeInTheDocument();
    expect(screen.getByText("Action 1")).toBeInTheDocument();
    expect(screen.getByText("Action 2")).toBeInTheDocument();
  });
});
