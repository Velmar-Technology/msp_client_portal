import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Users } from "lucide-react";
import { PageTogglePill } from "./PageTogglePill";

describe("PageTogglePill", () => {
  it("renders inactive state with icon and label", () => {
    const handleToggle = vi.fn();
    render(
      <PageTogglePill
        icon={Users}
        label="Shared with me"
        active={false}
        onToggle={handleToggle}
      />
    );

    const button = screen.getByRole("switch");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Shared with me");
    expect(button).toHaveAttribute("aria-checked", "false");

    fireEvent.click(button);
    expect(handleToggle).toHaveBeenCalledWith(true);
  });

  it("renders active state and toggles to false on click", () => {
    const handleToggle = vi.fn();
    render(
      <PageTogglePill
        label="Favorites"
        active={true}
        onToggle={handleToggle}
      />
    );

    const button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-checked", "true");
    expect(button).toHaveClass("text-primary");

    fireEvent.click(button);
    expect(handleToggle).toHaveBeenCalledWith(false);
  });

  it("disables interaction when disabled={true}", () => {
    const handleToggle = vi.fn();
    render(
      <PageTogglePill
        label="Disabled"
        active={false}
        disabled={true}
        onToggle={handleToggle}
      />
    );

    const button = screen.getByRole("switch");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleToggle).not.toHaveBeenCalled();
  });
});
