import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsGrid } from "./StatsGrid";

describe("StatsGrid", () => {
  it("renders children inside the responsive grid container", () => {
    render(
      <StatsGrid data-testid="stats-grid">
        <div>Metric 1</div>
        <div>Metric 2</div>
        <div>Metric 3</div>
        <div>Metric 4</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId("stats-grid");
    expect(grid).toBeInTheDocument();
    expect(screen.getByText("Metric 1")).toBeInTheDocument();
    expect(screen.getByText("Metric 4")).toBeInTheDocument();
  });

  it("applies balanced 4-column layout on desktop and 2-column layout on medium displays", () => {
    render(
      <StatsGrid data-testid="stats-grid">
        <div>Card</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId("stats-grid");
    // Verifies 1080p @ 150% (~1280px) sits in xl:grid-cols-4 and tablet sits in sm:grid-cols-2
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).toContain("xl:grid-cols-4");
    expect(grid.className).not.toContain("lg:grid-cols-3");
  });

  it("merges custom className prop correctly", () => {
    render(
      <StatsGrid data-testid="stats-grid" className="custom-class">
        <div>Card</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId("stats-grid");
    expect(grid.className).toContain("custom-class");
  });
});
