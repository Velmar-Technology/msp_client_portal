import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Failed to load chunk");
  }
  return <div>Component loaded successfully</div>;
};

describe("ChunkErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ChunkErrorBoundary>
        <div>Normal content</div>
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders default fallback UI with retry button when child throws", () => {
    // Suppress console.error during expected error boundary test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ChunkErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Unable to load section")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry section/i })).toBeInTheDocument();

    spy.mockRestore();
  });

  it("resets boundary state when retry button is clicked", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onReset = vi.fn();

    const { rerender } = render(
      <ChunkErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={true} />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Unable to load section")).toBeInTheDocument();

    // Fix the error condition and click retry
    fireEvent.click(screen.getByRole("button", { name: /retry section/i }));
    expect(onReset).toHaveBeenCalledTimes(1);

    rerender(
      <ChunkErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={false} />
      </ChunkErrorBoundary>
    );

    expect(screen.getByText("Component loaded successfully")).toBeInTheDocument();

    spy.mockRestore();
  });
});
