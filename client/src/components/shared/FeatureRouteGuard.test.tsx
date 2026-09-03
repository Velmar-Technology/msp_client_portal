import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { FeatureRouteGuard } from "./FeatureRouteGuard";
import { FEATURE_CODES } from "@/constants/subscriptions";

let isLockedMock = false;
let isLoadingMock = false;

vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => ({
    isFeatureLocked: () => isLockedMock,
    isLoading: isLoadingMock,
  }),
}));

vi.mock("./FeatureLockedPreview", () => ({
  FeatureLockedPreview: ({ requiredFeature }: { requiredFeature: string }) => (
    <div data-testid="mock-locked-preview">Locked: {requiredFeature}</div>
  ),
}));

vi.mock("@/routes/routeUtils", () => ({
  RouteLoadingSpinner: () => <div data-testid="mock-loading-spinner">Loading...</div>,
}));

describe("FeatureRouteGuard component", () => {
  beforeEach(() => {
    isLockedMock = false;
    isLoadingMock = false;
  });

  it("should render loading spinner when entitlements are loading", () => {
    isLoadingMock = true;
    render(
      <FeatureRouteGuard requiredFeature={FEATURE_CODES.PASSWORD_MANAGER}>
        <div data-testid="protected-content">Content</div>
      </FeatureRouteGuard>
    );

    expect(screen.getByTestId("mock-loading-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should render locked preview when feature is locked for client", () => {
    isLockedMock = true;
    render(
      <FeatureRouteGuard requiredFeature={FEATURE_CODES.PASSWORD_MANAGER}>
        <div data-testid="protected-content">Content</div>
      </FeatureRouteGuard>
    );

    expect(screen.getByTestId("mock-locked-preview")).toHaveTextContent("PASSWORD_MANAGER");
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should render children when feature is unlocked", () => {
    isLockedMock = false;
    render(
      <FeatureRouteGuard requiredFeature={FEATURE_CODES.PASSWORD_MANAGER}>
        <div data-testid="protected-content">Content</div>
      </FeatureRouteGuard>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-locked-preview")).not.toBeInTheDocument();
  });
});
