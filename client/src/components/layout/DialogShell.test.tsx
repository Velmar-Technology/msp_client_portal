import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DialogShell } from "./DialogShell";
import { Shield } from "lucide-react";

describe("DialogShell (Cal.com Architecture)", () => {
  test("renders title, description, icon and children when open", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <DialogShell
        open={true}
        onOpenChange={handleOpenChange}
        title="Confirm Deletion"
        description="This action cannot be undone."
        icon={Shield}
        submitLabel="Confirm"
        onSubmit={handleSubmit}
        cancelLabel="Dismiss"
      >
        <div>Custom modal body text</div>
      </DialogShell>
    );

    expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Custom modal body text")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(cancelBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
