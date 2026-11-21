import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SectionHeader } from "./SectionHeader";
import { Button } from "@/components/ui/button";

describe("SectionHeader", () => {
  it("renders title, description, and action button", () => {
    render(
      <SectionHeader
        title="API Configuration"
        description="Manage third-party integration endpoints and keys"
        actions={<Button size="sm">Regenerate Key</Button>}
      />
    );

    expect(screen.getByText("API Configuration")).toBeInTheDocument();
    expect(
      screen.getByText("Manage third-party integration endpoints and keys")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate Key" })).toBeInTheDocument();
  });

  it("applies border divider when bordered is true", () => {
    const { container } = render(
      <SectionHeader title="Header" bordered />
    );

    expect(container.firstChild).toHaveClass("border-b");
  });
});
