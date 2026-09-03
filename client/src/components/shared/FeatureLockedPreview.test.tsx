import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { FeatureLockedPreview } from "./FeatureLockedPreview";
import { FEATURE_CODES } from "@/constants/subscriptions";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => ({
    getRequiredTierForFeature: (code: string) => (code === FEATURE_CODES.PASSWORD_MANAGER ? "PL-003" : "PL-001"),
  }),
}));

describe("FeatureLockedPreview component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render password manager preview with upgrade button", () => {
    render(<FeatureLockedPreview requiredFeature={FEATURE_CODES.PASSWORD_MANAGER} />);

    expect(screen.getByTestId("feature-locked-preview")).toBeInTheDocument();
    expect(screen.getByText(/Enterprise Password Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Advanced Plan \(PL-003\)/i)).toBeInTheDocument();

    const upgradeBtn = screen.getByText(/View Plans & Upgrade/i);
    fireEvent.click(upgradeBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/plans?highlight=PL-003");
  });

  it("should render return to dashboard button and navigate on click", () => {
    render(<FeatureLockedPreview requiredFeature={FEATURE_CODES.RMM_PATCH_MANAGEMENT} />);

    const backBtn = screen.getByText(/Return to Dashboard/i);
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
