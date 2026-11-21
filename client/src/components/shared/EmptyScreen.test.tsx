import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyScreen } from "./EmptyScreen";
import { FileQuestion } from "lucide-react";

describe("EmptyScreen (Cal.com Architecture)", () => {
  test("renders icon, headline, description, and primary action button", () => {
    const handleClick = vi.fn();

    render(
      <EmptyScreen
        icon={FileQuestion}
        headline="No Invoices Found"
        description="You have no outstanding or settled invoices for this billing period."
        buttonText="Create Invoice"
        buttonOnClick={handleClick}
      />
    );

    expect(screen.getByText("No Invoices Found")).toBeInTheDocument();
    expect(screen.getByText("You have no outstanding or settled invoices for this billing period.")).toBeInTheDocument();
    
    const actionBtn = screen.getByRole("button", { name: "Create Invoice" });
    fireEvent.click(actionBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("renders custom buttonRaw when provided", () => {
    render(
      <EmptyScreen
        headline="Custom Empty"
        buttonRaw={<button type="button">Custom CTA</button>}
      />
    );

    expect(screen.getByText("Custom Empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom CTA" })).toBeInTheDocument();
  });
});
