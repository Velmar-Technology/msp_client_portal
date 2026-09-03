import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMyDevices, useActivateWithOtp, useDeactivateSlot } from "./useEquipment";
import { equipmentService } from "@/services/equipmentService";

vi.mock("@/services/equipmentService", () => ({
  equipmentService: {
    getMyDevices: vi.fn(),
    getAllDevicesForAdmin: vi.fn(),
    getSlots: vi.fn(),
    activateWithOtp: vi.fn(),
    deactivateSlot: vi.fn(),
    repairSlot: vi.fn(),
  },
}));

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

describe("useEquipment query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches client devices via useMyDevices", async () => {
    const mockDevices = [
      {
        id: "slot-1",
        subscription_id: "sub-1",
        slot_index: 0,
        status: "ACTIVE" as const,
        device_name: "Desktop-01",
        device_serial: "SN-1234",
        tenant_id: "tenant-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    vi.mocked(equipmentService.getMyDevices).mockResolvedValueOnce(mockDevices as any);

    const { result } = renderHook(() => useMyDevices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].device_name).toBe("Desktop-01");
    expect(equipmentService.getMyDevices).toHaveBeenCalledTimes(1);
  });

  it("executes activateWithOtp mutation", async () => {
    vi.mocked(equipmentService.activateWithOtp).mockResolvedValueOnce({
      id: "slot-1",
      status: "ACTIVE",
    } as any);

    const { result } = renderHook(() => useActivateWithOtp(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      otp: "123456",
      subscriptionId: "sub-1",
      slotIndex: 0,
      deviceName: "New-PC",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(equipmentService.activateWithOtp).toHaveBeenCalledWith({
      otp: "123456",
      subscriptionId: "sub-1",
      slotIndex: 0,
      deviceName: "New-PC",
    });
  });

  it("executes deactivateSlot mutation", async () => {
    vi.mocked(equipmentService.deactivateSlot).mockResolvedValueOnce({
      success: true,
    } as any);

    const { result } = renderHook(() => useDeactivateSlot(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ subId: "sub-1", slotIndex: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(equipmentService.deactivateSlot).toHaveBeenCalledWith("sub-1", 1);
  });
});
