import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentService } from '@/services/equipmentService';
import type { ActivateWithOtpInput } from '@shared/contracts';

/**
 * Standardized query keys for equipment and device slot queries.
 */
export const EQUIPMENT_QUERY_KEYS = {
  all: ['equipment'] as const,
  myDevices: () => [...EQUIPMENT_QUERY_KEYS.all, 'my-devices'] as const,
  adminDevices: () => [...EQUIPMENT_QUERY_KEYS.all, 'admin-devices'] as const,
  slots: (subId: string) => [...EQUIPMENT_QUERY_KEYS.all, 'slots', subId] as const,
  nextcloud: (subId: string, slotIndex: number) =>
    [...EQUIPMENT_QUERY_KEYS.all, 'nextcloud', subId, slotIndex] as const,
};

/**
 * Fetches active devices and provisioned slots for the current client.
 */
export function useMyDevices() {
  return useQuery({
    queryKey: EQUIPMENT_QUERY_KEYS.myDevices(),
    queryFn: () => equipmentService.getMyDevices(),
  });
}

/**
 * Fetches all hardware devices across all clients (Admin role only).
 */
export function useAdminDevices() {
  return useQuery({
    queryKey: EQUIPMENT_QUERY_KEYS.adminDevices(),
    queryFn: () => equipmentService.getAllDevicesForAdmin(),
  });
}

/**
 * Fetches device slots associated with a specific subscription.
 *
 * @param subId - Subscription UUID.
 */
export function useSubscriptionSlots(subId: string) {
  return useQuery({
    queryKey: EQUIPMENT_QUERY_KEYS.slots(subId),
    queryFn: () => equipmentService.getSlots(subId),
    enabled: !!subId,
  });
}

/**
 * Mutation to activate an equipment slot using a 6-digit OTP code.
 * Automatically invalidates equipment query cache on success.
 */
export function useActivateWithOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivateWithOtpInput) => equipmentService.activateWithOtp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
    },
  });
}

/**
 * Mutation to deactivate a provisioned hardware slot.
 * Automatically invalidates equipment query cache on success.
 */
export function useDeactivateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subId, slotIndex }: { subId: string; slotIndex: number }) =>
      equipmentService.deactivateSlot(subId, slotIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
    },
  });
}

/**
 * Mutation to unbind a hardware slot for re-pairing with a new agent.
 * Automatically invalidates equipment query cache on success.
 */
export function useRepairSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subId, slotIndex }: { subId: string; slotIndex: number }) =>
      equipmentService.repairSlot(subId, slotIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
    },
  });
}
