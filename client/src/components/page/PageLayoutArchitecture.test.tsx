import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Page } from "@/components/Page";
import { PageSettingRow, PageSettingGroup } from "./PageSettingRow";
import { User, ShieldCheck } from "lucide-react";

describe("ADR-016 Layout Architecture Compliance", () => {
  test("Page compound assembly exposes all modern layout primitives", () => {
    expect(Page.Tabs).toBeDefined();
    expect(Page.Notebook).toBeDefined();
    expect(Page.SettingRow).toBeDefined();
    expect(Page.SettingGroup).toBeDefined();
    expect(Page.Banner).toBeDefined();
    expect(Page.Callout).toBeDefined();
    expect(Page.EmptyState).toBeDefined();
    expect(Page.ContentCard).toBeDefined();
  });

  test("Page.Tabs defaults to 'bubble' variant with non-expanding pills", () => {
    render(
      <Page.Tabs
        tabs={[
          { id: "tab1", label: "Profile", icon: User },
          { id: "tab2", label: "Security", icon: ShieldCheck },
        ]}
        activeTab="tab1"
        onTabChange={vi.fn()}
      />
    );

    const tab1 = screen.getByRole("tab", { name: /Profile/i });
    const tab2 = screen.getByRole("tab", { name: /Security/i });

    expect(tab1).toBeInTheDocument();
    expect(tab2).toBeInTheDocument();

    // Verify non-expanding pill classes (flex-none shrink-0 rounded-full)
    expect(tab1).toHaveClass("flex-none");
    expect(tab1).toHaveClass("shrink-0");
    expect(tab1).toHaveClass("rounded-full");
    expect(tab2).toHaveClass("flex-none");
    expect(tab2).toHaveClass("shrink-0");
  });

  test("PageSettingRow complies with card-less list specification and flat danger zone", () => {
    const { container } = render(
      <div className="divide-y divide-border/50">
        <PageSettingRow
          label="Full Name"
          description="Estiven Polanco"
          action={<button>Update Name</button>}
        />
        <PageSettingRow
          danger
          label="Delete Account"
          description="Permanently delete this account"
          action={<button>Delete</button>}
        />
      </div>
    );

    const normalLabel = screen.getByText("Full Name");
    expect(normalLabel).toHaveClass("text-foreground font-semibold");

    const dangerLabel = screen.getByText("Delete Account");
    expect(dangerLabel).toHaveClass("text-destructive font-semibold");

    // Danger row must NOT contain pink background classes (bg-red-500/5 or -mx-4)
    const dangerRow = dangerLabel.closest("div")?.parentElement;
    expect(dangerRow).not.toHaveClass("bg-red-500/5");
    expect(dangerRow).not.toHaveClass("-mx-4");
  });

  test("PageSettingGroup renders clean section container", () => {
    render(
      <PageSettingGroup title="Security Settings" description="Manage authentication and session options">
        <PageSettingRow label="Two-Factor Authentication" description="Enforce TOTP on login" />
      </PageSettingGroup>
    );

    expect(screen.getByText("Security Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage authentication and session options")).toBeInTheDocument();
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
  });
});
