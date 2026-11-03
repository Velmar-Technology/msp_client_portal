import "@testing-library/jest-dom";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsHubPage } from "./SettingsHubPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      userId: "usr-1",
      tenantId: "11111111-1111-4111-a111-111111111111",
      name: "Alice Engineer",
      email: "alice@velmar.local",
      role: "ADMIN",
      emailVerified: true,
      clientType: "ENTERPRISE",
    },
  }),
}));

vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => ({
    hasFeature: () => true,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string) => defaultVal || _key,
    i18n: { language: "en_US" },
  }),
}));

describe("SettingsHubPage (ADR-016 / ADR-019)", () => {
  test("renders unified page title and bubble tabs", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <SettingsHubPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("AI / BYOK")).toBeInTheDocument();
  });

  test("renders general workspace settings by default", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <SettingsHubPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Workspace Identity")).toBeInTheDocument();
    expect(screen.getByText("Organization Name")).toBeInTheDocument();
    expect(screen.getByText("Default Language")).toBeInTheDocument();
  });

  test("switches to profile tab when clicked", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <SettingsHubPage />
      </MemoryRouter>
    );

    const profileTab = screen.getByText("Profile");
    fireEvent.click(profileTab);

    expect(screen.getByText("Personal Account")).toBeInTheDocument();
    expect(screen.getByText("Alice Engineer")).toBeInTheDocument();
    expect(screen.getByText("alice@velmar.local")).toBeInTheDocument();
    expect(screen.getByText("Revoke Active Sessions")).toBeInTheDocument();
  });
});
