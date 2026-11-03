import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PageSearchInput } from "./PageSearchInput";

describe("PageSearchInput", () => {
  it("renders search input with placeholder and value", () => {
    render(<PageSearchInput value="alice" onChange={vi.fn()} placeholder="Search users by ID..." />);
    const input = screen.getByTestId("page-search-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("alice");
    expect(input.placeholder).toBe("Search users by ID...");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<PageSearchInput value="" onChange={onChange} />);
    const input = screen.getByTestId("page-search-input");
    fireEvent.change(input, { target: { value: "bob" } });
    expect(onChange).toHaveBeenCalledWith("bob");
  });

  it("renders clear button when value is present and clears on click", () => {
    const onChange = vi.fn();
    render(<PageSearchInput value="charlie" onChange={onChange} />);
    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
