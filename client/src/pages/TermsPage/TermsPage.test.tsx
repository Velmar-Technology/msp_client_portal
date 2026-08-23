import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.hoisted(() => {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });
  }
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TermsPage } from "./TermsPage";
import enTranslations from "@/locales/en_US.json";

let mockLanguage = "en_US";

const mockT = (key: string) => {
  const parts = key.split(".");
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      get language() {
        return mockLanguage;
      },
    },
  }),
}));

describe("TermsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renders terms page header and title", () => {
    mockLanguage = "en_US";
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("General Terms and Conditions of Service - Velmar Technology SRL")).toBeInTheDocument();
  });

  test("renders equipment section specifying availability after one (1) month of subscription in English", () => {
    mockLanguage = "en_US";
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("7. Equipment on Loan (Hardware Bailment / Comodato)")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("equipment lending becomes available after one (1) month of active subscription"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("becomes available to THE CLIENT after completing one (1) month of active subscription"))
    ).toBeInTheDocument();
  });

  test("renders equipment section specifying availability after one (1) month of subscription in Spanish", () => {
    mockLanguage = "es_DO";
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("7. Equipos en Comodato (Préstamo de Hardware)")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("el préstamo de equipos estará disponible después de un (1) mes de suscripción activa"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("estarán disponibles para EL CLIENTE tras cumplir un (1) mes de suscripción activa"))
    ).toBeInTheDocument();
  });
});
