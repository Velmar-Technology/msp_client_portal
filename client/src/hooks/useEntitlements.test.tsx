import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEntitlements } from "./useEntitlements";
import { FEATURE_CODES } from "@/constants/subscriptions";

const mockAuthUser = {
  id: "user-1",
  email: "test@example.com",
  role: "CLIENT",
  name: "Test Client",
  tenantId: "tenant-1",
};

let currentRole = "CLIENT";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { ...mockAuthUser, role: currentRole },
    isAuthenticated: true,
  }),
}));

let mockSubscriptions: any[] = [];
let mockPlans: any[] = [];

vi.mock("@/services/subscriptionService", () => ({
  subscriptionService: {
    getAll: vi.fn(async () => mockSubscriptions),
  },
}));

vi.mock("@/services/planService", () => ({
  planService: {
    getAll: vi.fn(async () => mockPlans),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useEntitlements hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRole = "CLIENT";
    mockSubscriptions = [];
    mockPlans = [];
  });

  it("should unlock all features unconditionally for ADMIN role", () => {
    currentRole = "ADMIN";
    const { result } = renderHook(() => useEntitlements(), { wrapper: createWrapper() });

    expect(result.current.hasFeature(FEATURE_CODES.PASSWORD_MANAGER)).toBe(true);
    expect(result.current.isFeatureLocked(FEATURE_CODES.PASSWORD_MANAGER)).toBe(false);
    expect(result.current.hasFeature(FEATURE_CODES.RMM_PATCH_MANAGEMENT)).toBe(true);
    expect(result.current.isFeatureLocked(FEATURE_CODES.RMM_PATCH_MANAGEMENT)).toBe(false);
  });

  it("should unlock all features unconditionally for TECHNICIAN role", () => {
    currentRole = "TECHNICIAN";
    const { result } = renderHook(() => useEntitlements(), { wrapper: createWrapper() });

    expect(result.current.hasFeature(FEATURE_CODES.PASSWORD_MANAGER)).toBe(true);
    expect(result.current.isFeatureLocked(FEATURE_CODES.PASSWORD_MANAGER)).toBe(false);
  });

  it("should lock features for CLIENT when no active subscriptions exist", async () => {
    currentRole = "CLIENT";
    mockSubscriptions = [{ id: "sub-1", plan: "PL-001", status: "EXPIRED" }];
    mockPlans = [{ id: "PL-001", features: [{ code: FEATURE_CODES.CLOUD_STORAGE, included: true }] }];

    const { result } = renderHook(() => useEntitlements(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.hasFeature(FEATURE_CODES.CLOUD_STORAGE)).toBe(false);
    });

    expect(result.current.isFeatureLocked(FEATURE_CODES.CLOUD_STORAGE)).toBe(true);
    expect(result.current.hasActiveSubscription).toBe(false);
  });

  it("should unlock only included features for CLIENT with active Basic plan", async () => {
    currentRole = "CLIENT";
    mockSubscriptions = [{ id: "sub-1", plan: "PL-001", status: "ACTIVE" }];
    mockPlans = [
      {
        id: "PL-001",
        features: [
          { code: FEATURE_CODES.CLOUD_STORAGE, included: true },
          { code: FEATURE_CODES.RMM_PATCH_MANAGEMENT, included: true },
          { code: FEATURE_CODES.PASSWORD_MANAGER, included: false },
        ],
      },
    ];

    const { result } = renderHook(() => useEntitlements(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.hasFeature(FEATURE_CODES.CLOUD_STORAGE)).toBe(true);
    });

    expect(result.current.isFeatureLocked(FEATURE_CODES.CLOUD_STORAGE)).toBe(false);
    expect(result.current.hasFeature(FEATURE_CODES.PASSWORD_MANAGER)).toBe(false);
    expect(result.current.isFeatureLocked(FEATURE_CODES.PASSWORD_MANAGER)).toBe(true);
    expect(result.current.getRequiredTierForFeature(FEATURE_CODES.PASSWORD_MANAGER)).toBe("PL-003");
  });

  it("should unlock constituent features when client is subscribed to a bundle like PASSWORD_DARK_WEB", async () => {
    currentRole = "CLIENT";
    mockSubscriptions = [{ id: "sub-1", plan: "PL-BUNDLE", status: "ACTIVE" }];
    mockPlans = [
      {
        id: "PL-BUNDLE",
        features: [
          { code: FEATURE_CODES.PASSWORD_DARK_WEB, included: true },
        ],
      },
    ];

    const { result } = renderHook(() => useEntitlements(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.hasFeature(FEATURE_CODES.PASSWORD_MANAGER)).toBe(true);
    });

    expect(result.current.isFeatureLocked(FEATURE_CODES.PASSWORD_MANAGER)).toBe(false);
    expect(result.current.hasFeature(FEATURE_CODES.DARK_WEB_MONITORING)).toBe(true);
    expect(result.current.isFeatureLocked(FEATURE_CODES.DARK_WEB_MONITORING)).toBe(false);
  });
});
