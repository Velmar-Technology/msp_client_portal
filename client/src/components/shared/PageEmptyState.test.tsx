import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PageEmptyState } from "./PageEmptyState";

describe("PageEmptyState", () => {
  it("renders empty state title and description", () => {
    render(
      <PageEmptyState
        title="No users found"
        description="No users have interacted with your agents yet."
      />
    );

    expect(screen.getByText("No users found")).toBeInTheDocument();
    expect(screen.getByText("No users have interacted with your agents yet.")).toBeInTheDocument();
  });

  it("renders action button and triggers callback on click", () => {
    const onAction = vi.fn();
    render(
      <PageEmptyState
        title="No users found"
        description="No users match your criteria."
        actionLabel="Clear all filters"
        onAction={onAction}
      />
    );

    const actionBtn = screen.getByRole("button", { name: /clear all filters/i });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalled();
  });
});
