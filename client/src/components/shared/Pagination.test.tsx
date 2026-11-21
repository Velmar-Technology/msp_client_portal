import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination (Cal.com Architecture)", () => {
  test("renders page count and triggers navigation callbacks", () => {
    const handlePageChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
    expect(screen.getByText("50 items")).toBeInTheDocument();

    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    const nextBtn = screen.getByRole("button", { name: "Next page" });
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});
