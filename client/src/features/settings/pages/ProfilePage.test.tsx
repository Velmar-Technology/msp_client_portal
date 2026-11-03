import "@testing-library/jest-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import enTranslations from "@/locales/en_US.json";

const mockUser = {
  id: "user-1",
  name: "Estiven Polanco",
  email: "estiven@example.com",
  role: "ADMIN",
  language: "en_US",
  phoneNumber: "+1 (809) 555-0199",
  rnc: "1-32-12345-6",
  clientType: "ENTERPRISE",
  accountStatus: "ACTIVE",
  lastLoginAt: new Date().toISOString(),
  lastLoginIp: "192.168.1.1",
};

const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    updateUser: mockUpdateUser,
    logout: mockLogout,
    isAuthenticated: true,
  })),
}));

vi.mock("@/features/users", () => ({
  userService: {
    getApiKeys: vi.fn().mockResolvedValue([]),
    generateApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    uploadAvatar: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue({}),
    changePassword: vi.fn().mockResolvedValue({}),
  },
}));

const mockT = (key: string, defaultVal?: string) => {
  const parts = key.split(".");
  let current: any = enTranslations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return defaultVal || key;
    }
  }
  return typeof current === "string" ? current : defaultVal || key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

describe("ProfilePage (ElevenLabs Layout)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders header, bubble tabs, and profile setting rows", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Security & Password/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /API Keys/i })).toBeInTheDocument();

    expect(screen.getByText("Profile Picture & Identity")).toBeInTheDocument();
    expect(screen.getAllByText("Estiven Polanco").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("estiven@example.com")).toBeInTheDocument();
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(screen.getByText("RNC / Tax ID")).toBeInTheDocument();
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Sign out of all devices")).toBeInTheDocument();
    expect(screen.getByText("Delete Entire Account")).toBeInTheDocument();
  });

  test("opens Update Name modal when clicking Update Name button", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    const updateNameBtn = screen.getByRole("button", { name: "Update Name" });
    fireEvent.click(updateNameBtn);

    expect(await screen.findByText("Update Full Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Estiven Polanco")).toBeInTheDocument();
  });

  test("switches between bubble tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    const securityTab = screen.getByRole("tab", { name: /Security & Password/i });
    fireEvent.click(securityTab);

    expect(await screen.findByText("Account Password")).toBeInTheDocument();
    expect(screen.getByText("Two-Factor Authentication (2FA)")).toBeInTheDocument();
    expect(screen.getByText("Active Session & Security Log")).toBeInTheDocument();
  });

  test("calls logout on Sign Out button click", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(signOutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
