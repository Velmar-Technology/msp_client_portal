import "@testing-library/jest-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import enTranslations from "@/locales/en_US.json";
import esTranslations from "@/locales/es_DO.json";

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
    getApiKeys: vi.fn().mockResolvedValue([
      {
        id: "key-1",
        name: "Test API Key",
        description: "Test description",
        expiresIn: "30d",
        createdAt: "2026-11-01T12:00:00Z",
      },
    ]),
    generateApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    uploadAvatar: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue({}),
    changePassword: vi.fn().mockResolvedValue({}),
  },
}));

let currentLang = "en_US";

const createMockT = (lang: string) => (key: string, defaultVal?: unknown) => {
  const parts = key.split(".");
  const translations = lang === "es_DO" ? esTranslations : enTranslations;
  let current: any = translations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return typeof defaultVal === "string" ? defaultVal : key;
    }
  }
  return typeof current === "string" ? current : typeof defaultVal === "string" ? defaultVal : key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: unknown) => createMockT(currentLang)(key, defaultVal),
    i18n: {
      language: currentLang,
      changeLanguage: vi.fn(async (newLang: string) => {
        currentLang = newLang;
      }),
    },
  }),
}));

describe("ProfilePage (ElevenLabs Layout & i18n)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLang = "en_US";
  });

  test("renders header, bubble tabs, and profile setting rows in English", async () => {
    currentLang = "en_US";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

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

  test("renders header, bubble tabs, and setting rows in Spanish (es_DO)", async () => {
    currentLang = "es_DO";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Configuración")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /Perfil/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Seguridad y Contraseña/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Claves de API/i })).toBeInTheDocument();

    expect(screen.getByText("Foto de perfil e identidad")).toBeInTheDocument();
    expect(screen.getAllByText("Estiven Polanco").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Correo Electrónico")).toBeInTheDocument();
    expect(screen.getByText("estiven@example.com")).toBeInTheDocument();
    expect(screen.getByText("Nombre Completo")).toBeInTheDocument();
    expect(screen.getByText("Número de Teléfono")).toBeInTheDocument();
    expect(screen.getByText("RNC / Cédula")).toBeInTheDocument();
    expect(screen.getByText("Plan Actual")).toBeInTheDocument();
    expect(screen.getByText("Configuración de Idioma")).toBeInTheDocument();
    expect(screen.getByText("Cerrar sesión en todos los dispositivos")).toBeInTheDocument();
    expect(screen.getByText("Eliminar Cuenta Completa")).toBeInTheDocument();
  });

  test("opens Update Name modal with localized cancel and submit buttons", async () => {
    currentLang = "es_DO";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Actualizar Nombre" })).toBeInTheDocument();
    });

    const updateNameBtn = screen.getByRole("button", { name: "Actualizar Nombre" });
    fireEvent.click(updateNameBtn);

    expect(await screen.findByText("Actualizar Nombre Completo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Estiven Polanco")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeInTheDocument();
  });

  test("switches between bubble tabs in Spanish", async () => {
    currentLang = "es_DO";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Seguridad y Contraseña/i })).toBeInTheDocument();
    });

    const securityTab = screen.getByRole("tab", { name: /Seguridad y Contraseña/i });
    fireEvent.click(securityTab);

    expect(await screen.findByText("Contraseña de la Cuenta")).toBeInTheDocument();
    expect(screen.getByText("Autenticación de Dos Factores (2FA)")).toBeInTheDocument();
    expect(screen.getByText("Sesión Activa y Registro de Seguridad")).toBeInTheDocument();
  });

  test("renders API keys table headers localized in Spanish", async () => {
    currentLang = "es_DO";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Claves de API/i })).toBeInTheDocument();
    });

    const apiKeysTab = screen.getByRole("tab", { name: /Claves de API/i });
    fireEvent.click(apiKeysTab);

    expect(await screen.findByText("Nombre de la Clave")).toBeInTheDocument();
    expect(screen.getByText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("Vence")).toBeInTheDocument();
    expect(screen.getByText("Creado")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  test("calls logout on Sign Out button click", async () => {
    currentLang = "en_US";
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });

    const signOutBtn = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(signOutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
