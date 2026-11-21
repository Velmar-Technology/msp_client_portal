import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardLayout } from "./WizardLayout";

describe("WizardLayout (Cal.com Architecture)", () => {
  test("renders title, subtitle, and step indicators", () => {
    render(
      <WizardLayout
        title="Setup Organization"
        subtitle="Configure your workspace parameters"
        currentStep={2}
        maxSteps={4}
      >
        <div>Step 2 Form Content</div>
      </WizardLayout>
    );

    expect(screen.getByText("Setup Organization")).toBeInTheDocument();
    expect(screen.getByText("Configure your workspace parameters")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Step 2 Form Content")).toBeInTheDocument();
  });

  test("triggers onBack and onLater callbacks", () => {
    const handleBack = vi.fn();
    const handleLater = vi.fn();

    render(
      <WizardLayout
        title="Payment Setup"
        currentStep={1}
        maxSteps={2}
        onBack={handleBack}
        onLater={handleLater}
        laterLabel="Skip for now"
      >
        <div>Payment details</div>
      </WizardLayout>
    );

    const backButton = screen.getByRole("button", { name: "Go back" });
    fireEvent.click(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);

    const laterButton = screen.getByRole("button", { name: "Skip for now" });
    fireEvent.click(laterButton);
    expect(handleLater).toHaveBeenCalledTimes(1);
  });
});
