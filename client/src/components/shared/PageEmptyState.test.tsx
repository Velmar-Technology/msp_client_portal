import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlayCircle, Box, Pause } from "lucide-react";
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

  it("renders dual actions with primary button and secondary guide link", () => {
    const handlePrimary = vi.fn();
    render(
      <PageEmptyState
        title="No tests found"
        description="You have not created any tests yet."
        primaryAction={{
          label: "Create your first test",
          onClick: handlePrimary,
        }}
        secondaryAction={{
          label: "Learn how",
          icon: PlayCircle,
          href: "https://docs.example.com",
        }}
      />
    );

    const primaryBtn = screen.getByRole("button", { name: "Create your first test" });
    expect(primaryBtn).toBeInTheDocument();
    fireEvent.click(primaryBtn);
    expect(handlePrimary).toHaveBeenCalledTimes(1);

    const secondaryLink = screen.getByRole("link", { name: "Learn how" });
    expect(secondaryLink).toBeInTheDocument();
    expect(secondaryLink).toHaveAttribute("href", "https://docs.example.com");
  });

  it("renders connected integration flow icons when connectedIcons provided", () => {
    render(
      <PageEmptyState
        title="No API keys"
        description="Create your first key to connect."
        connectedIcons={{
          from: Box,
          to: Pause,
        }}
      />
    );

    expect(screen.getByTestId("empty-state-connected-icons")).toBeInTheDocument();
  });
});
