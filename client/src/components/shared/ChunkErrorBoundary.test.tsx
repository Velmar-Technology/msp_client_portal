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

    // Update child prop to not throw on subsequent render, then trigger retry
    rerender(
      <ChunkErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={false} />
      </ChunkErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /retry section/i }));
    expect(onReset).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Component loaded successfully")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("calls onError callback when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ChunkErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ChunkErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ componentStack: expect.any(String) }));

    spy.mockRestore();
  });
});
