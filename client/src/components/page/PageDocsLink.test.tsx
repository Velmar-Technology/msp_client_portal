import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageDocsLink } from "./PageDocsLink";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

describe("PageDocsLink", () => {
  it("renders external anchor link with tooltip label and target _blank", () => {
    render(<PageDocsLink href="https://docs.example.com" label="View API Docs" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://docs.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders button when onClick handler is provided without href", () => {
    const handleClick = vi.fn();
    render(<PageDocsLink onClick={handleClick} label="Open guide" />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
