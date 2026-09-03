import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSubscriptions, usePlans, useCreateSubscription, subscriptionService, planService } from "@/features/subscriptions";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useSubscriptions query hooks (Legacy Re-export)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches subscriptions via useSubscriptions", async () => {
    const mockSubs = [
      {
        id: "sub-1",
        client_id: "client-1",
        service_name: "Gold Support",
        plan: "PREMIUM",
        status: "ACTIVE",
        renewal_date: new Date().toISOString(),
        equipment_count: 5,
        created_at: new Date().toISOString(),
      },
    ];

    const getAllSpy = vi.spyOn(subscriptionService, 'getAll').mockResolvedValueOnce(mockSubs as any);

    const { result } = renderHook(() => useSubscriptions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].service_name).toBe("Gold Support");
    expect(getAllSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches plans via usePlans", async () => {
    const mockPlans = [
      {
        id: "PLAN-BASIC",
        name: "Basic Plan",
        price: 29,
        features: [],
        recommended: false,
        client_type: "CLIENT" as const,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const getAllSpy = vi.spyOn(planService, 'getAll').mockResolvedValueOnce(mockPlans as any);

    const { result } = renderHook(() => usePlans({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(getAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("executes createSubscription mutation", async () => {
    const createSpy = vi.spyOn(subscriptionService, 'create').mockResolvedValueOnce({
      id: "sub-new",
      service_name: "Custom Tier",
      plan: "STANDARD",
      equipment_count: 3,
      status: "ACTIVE",
      renewal_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as any);

    const { result } = renderHook(() => useCreateSubscription(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      serviceName: "Custom Tier",
      plan: "STANDARD",
      equipmentCount: 3,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createSpy).toHaveBeenCalledWith({
      serviceName: "Custom Tier",
      plan: "STANDARD",
      equipmentCount: 3,
    });
  });
});
