import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormCard, FormCardBody } from "./FormCard";
import { Button } from "@/components/ui/button";

describe("FormCard", () => {
  it("renders title, description, header actions, and footer", () => {
    render(
      <FormCard
        title="Session Security"
        description="Configure inactivity timeouts and multi-factor authentication"
        headerActions={<Button variant="outline" size="sm">Audit Logs</Button>}
        footer={<Button size="sm">Save Changes</Button>}
      >
        <div>Row 1 Content</div>
        <div>Row 2 Content</div>
      </FormCard>
    );

    expect(screen.getByText("Session Security")).toBeInTheDocument();
    expect(
      screen.getByText("Configure inactivity timeouts and multi-factor authentication")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByText("Row 1 Content")).toBeInTheDocument();
    expect(screen.getByText("Row 2 Content")).toBeInTheDocument();
  });

  it("renders FormCardBody without crashing", () => {
    render(
      <FormCardBody>
        <p>Custom form fields</p>
      </FormCardBody>
    );

    expect(screen.getByText("Custom form fields")).toBeInTheDocument();
  });
});
