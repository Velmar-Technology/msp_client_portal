import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sparkles, Copy } from "lucide-react";
import { PageBanner } from "./PageBanner";

describe("PageBanner", () => {
  it("renders banner title, description, and action button", () => {
    const handleAction = vi.fn();

    render(
      <PageBanner
        icon={Sparkles}
        title="Let your coding agent set this up."
        description="One prompt signs you in, creates a key, and adds the SDK."
        action={{
          label: "Copy prompt",
          icon: Copy,
          onClick: handleAction,
        }}
      />
    );

    expect(screen.getByText("Let your coding agent set this up.")).toBeInTheDocument();
    expect(screen.getByText("One prompt signs you in, creates a key, and adds the SDK.")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Copy prompt/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalled();
  });

  it("triggers onDismiss callback when dismiss button clicked", () => {
    const handleDismiss = vi.fn();

    render(
      <PageBanner
        title="Notice"
        description="Dismissible announcement"
        onDismiss={handleDismiss}
      />
    );

    const dismissBtn = screen.getByLabelText("Dismiss banner");
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalled();
  });
});
