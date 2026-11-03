import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PageSettingRow, PageSettingGroup } from "./PageSettingRow";
import { User } from "lucide-react";

describe("PageSettingRow", () => {
  test("renders label, description, and action button", () => {
    const handleAction = vi.fn();
    render(
      <PageSettingRow
        icon={User}
        label="Full Name"
        description="John Doe"
        action={<button onClick={handleAction}>Update Name</button>}
      />
    );

    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Update Name" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  test("renders danger variant with destructive styling", () => {
    render(
      <PageSettingRow
        label="Delete Account"
        description="Permanently delete your account"
        danger
        action={<button>Delete</button>}
      />
    );

    const label = screen.getByText("Delete Account");
    expect(label).toHaveClass("text-destructive");
  });
});

describe("PageSettingGroup", () => {
  test("renders group title and description with rows", () => {
    render(
      <PageSettingGroup
        title="Account Preferences"
        description="Manage your account preferences"
      >
        <PageSettingRow label="Language" description="English" />
        <PageSettingRow label="Theme" description="Dark" />
      </PageSettingGroup>
    );

    expect(screen.getByText("Account Preferences")).toBeInTheDocument();
    expect(screen.getByText("Manage your account preferences")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });
});
