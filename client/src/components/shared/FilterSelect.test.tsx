import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterSelect } from "./FilterSelect";

describe("FilterSelect (Cal.com Architecture)", () => {
  test("renders select trigger with placeholder", () => {
    const options = [
      { value: "all", label: "All Invoices" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
    ];

    render(
      <FilterSelect
        options={options}
        placeholder="Filter Status"
      />
    );

    expect(screen.getByText("Filter Status")).toBeInTheDocument();
  });
});
