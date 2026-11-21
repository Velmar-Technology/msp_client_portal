import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ListGroup, ListItem } from "./ListGroup";

describe("ListGroup & ListItem (Cal.com Architecture)", () => {
  test("renders list items with title, description, and trailing content", () => {
    const handleClick = vi.fn();

    render(
      <MemoryRouter>
        <ListGroup>
          <ListItem
            title="INV-2026-001"
            description="Due in 5 days • $1,250.00 USD"
            trailing={<span>Paid</span>}
            onClick={handleClick}
          />
          <ListItem
            title="INV-2026-002"
            description="Overdue • $850.00 USD"
            trailing={<span>Overdue</span>}
          />
        </ListGroup>
      </MemoryRouter>
    );

    expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Due in 5 days • $1,250.00 USD")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("INV-2026-002")).toBeInTheDocument();

    const firstItem = screen.getByText("INV-2026-001");
    fireEvent.click(firstItem);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("renders router Link when href is provided", () => {
    render(
      <MemoryRouter>
        <ListGroup>
          <ListItem
            href="/billing/invoices/inv-123"
            title="Invoice Detail Link"
            description="Click to open"
          />
        </ListGroup>
      </MemoryRouter>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/billing/invoices/inv-123");
    expect(screen.getByText("Invoice Detail Link")).toBeInTheDocument();
  });
});
