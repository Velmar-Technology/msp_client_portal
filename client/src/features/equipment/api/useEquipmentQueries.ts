import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { SubscriptionEquipment, ActivateWithOtpInput, DeviceVaultDetails } from '@shared/contracts';
export type { DeviceVaultDetails };
import { subscriptionService, SUBSCRIPTION_QUERY_KEYS } from '@/features/subscriptions';
import type { Subscription } from '@/features/subscriptions';
import { equipmentService } from './equipmentService';

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
  vault: (equipmentId: string) => [...EQUIPMENT_QUERY_KEYS.all, 'vault', equipmentId] as const,
};

const DEVICES_KEY = EQUIPMENT_QUERY_KEYS.all[0];
const SUBSCRIPTIONS_KEY = SUBSCRIPTION_QUERY_KEYS?.all?.[0] ?? 'subscriptions';

/**
 * SOTA / ADR-003 Query Options for Equipment & Devices
 */
export const equipmentQueryOptions = {
  myDevices: () => ({
    queryKey: EQUIPMENT_QUERY_KEYS.myDevices(),
    queryFn: () => equipmentService.getMyDevices(),
  }),
  adminDevices: () => ({
    queryKey: EQUIPMENT_QUERY_KEYS.adminDevices(),
    queryFn: () => equipmentService.getAllDevicesForAdmin(),
  }),
};

/**
 * Fetches active devices and provisioned slots for the current client.
 */
export function useMyDevices() {
  return useQuery(equipmentQueryOptions.myDevices());
}

/**
 * Fetches all hardware devices across all clients (Admin role only).
 */
export function useAdminDevices() {
  return useQuery(equipmentQueryOptions.adminDevices());
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

function groupDevicesBySub(
  devices: SubscriptionEquipment[],
  activeSubIds?: Set<string>,
): Record<string, Partial<SubscriptionEquipment>[]> {
  const grouped: Record<string, Partial<SubscriptionEquipment>[]> = {};
  for (const d of devices) {
    if (activeSubIds && !activeSubIds.has(d.subscription_id)) continue;
    if (!grouped[d.subscription_id]) grouped[d.subscription_id] = [];
    grouped[d.subscription_id][d.slot_index] = d;
  }
  return grouped;
}

function fillEmptySlots(
  grouped: Record<string, Partial<SubscriptionEquipment>[]>,
  subs: Subscription[],
) {
  for (const sub of subs) {
    if (!grouped[sub.id]) grouped[sub.id] = [];
    const arr = grouped[sub.id];
    for (let i = 0; i < sub.equipment_count; i++) {
      if (!arr[i]) {
        arr[i] = {
          id: `device-slot-${i}`,
          subscription_id: sub.id,
          slot_index: i,
          status: 'PENDING_ACTIVATION' as const,
        };
      }
    }
  }
}

/**
 * All data-fetching queries and mutations for the Devices page.
 * Returns raw query results plus helper mutation objects with `isPending` state.
 */
export function useDeviceQueries(isAdmin: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
  };

  // Admin Query
  const adminQuery = useQuery({
    queryKey: [DEVICES_KEY, 'admin'],
    queryFn: equipmentService.getAllDevicesForAdmin,
    enabled: isAdmin,
    select: (rawDevices) => {
      const devices = rawDevices.filter(
        (d) =>
          (!d.subscription_status ||
            d.subscription_status === 'ACTIVE' ||
            d.subscription_status === 'EXPIRING') &&
          (!d.client_role || d.client_role === 'CLIENT' || d.client_role === 'ADMIN'),
      );
      const grouped = groupDevicesBySub(devices);
      for (const subId of Object.keys(grouped)) {
        const arr = grouped[subId];
        for (let i = 0; i < arr.length; i++) {
          if (!arr[i]) {
            arr[i] = {
              id: `device-slot-${i}`,
              subscription_id: subId,
              slot_index: i,
              status: 'PENDING_ACTIVATION',
            };
          }
        }
      }
      return { devices, grouped };
    },
  });

  // Client Queries
  const subscriptionsQuery = useQuery({
    queryKey: [SUBSCRIPTIONS_KEY, 'active'],
    queryFn: subscriptionService.getAll,
    enabled: !isAdmin,
    select: (subs) => subs.filter((s) => s.status === 'ACTIVE' || s.status === 'EXPIRING'),
  });

  const devicesQuery = useQuery({
    queryKey: [DEVICES_KEY, 'my'],
    queryFn: equipmentService.getMyDevices,
    enabled: !isAdmin,
    select: (allDevices) => allDevices,
  });

  // Derived: grouped equipment for client view
  const clientEquipment = useMemo(() => {
    if (isAdmin) return null;
    const activeSubs = subscriptionsQuery.data;
    const allDevices = devicesQuery.data;
    if (!activeSubs || !allDevices) {
      return {
        grouped: {} as Record<string, Partial<SubscriptionEquipment>[]>,
        activeSubIds: new Set<string>(),
      };
    }

    const activeSubIds = new Set(activeSubs.map((s) => s.id));
    const grouped = groupDevicesBySub(allDevices, activeSubIds);
    fillEmptySlots(grouped, activeSubs);
    return { grouped, activeSubIds };
  }, [isAdmin, subscriptionsQuery.data, devicesQuery.data]);

  // Unified derived state
  const loading = isAdmin
    ? adminQuery.isLoading
    : subscriptionsQuery.isLoading || devicesQuery.isLoading;
  const activeSubscriptions = isAdmin ? [] : (subscriptionsQuery.data ?? []);
  const subscriptionEquipment = isAdmin
    ? (adminQuery.data?.grouped ?? {})
    : (clientEquipment?.grouped ?? {});
  const adminDevices = isAdmin ? (adminQuery.data?.devices ?? []) : [];

  // Mutations
  const deactivateMutation = useMutation({
    mutationFn: ({ subId, slotIndex }: { subId: string; slotIndex: number }) =>
      equipmentService.deactivateSlot(subId, slotIndex),
    onSuccess: (updatedSlot) => {
      invalidate();
      toast.info(t('devices.slotRevokedTitle'), {
        description:
          t('devices.slotRevokedDesc') || 'Device slot revoked. Cloud storage account deleted.',
      });
      return updatedSlot;
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error'), {
        description:
          error.response?.data?.message ||
          error.message ||
          t('devices.revokeFailed') ||
          'Failed to deactivate slot.',
      });
    },
  });

  const repairMutation = useMutation({
    mutationFn: ({ subId, slotIndex }: { subId: string; slotIndex: number }) =>
      equipmentService.repairSlot(subId, slotIndex),
    onSuccess: (updatedSlot) => {
      invalidate();
      toast.success(t('devices.repairSuccessTitle') || 'Device re-paired', {
        description:
          t('devices.repairSuccessDesc') ||
          "Device unbound. Cloud account preserved with a rotated password. Enter the new agent's code to re-link.",
      });
      return updatedSlot;
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error'), {
        description:
          error.response?.data?.message ||
          error.message ||
          t('devices.repairFailed') ||
          'Failed to re-pair device.',
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (data: {
      otp: string;
      subscriptionId: string;
      slotIndex: number;
      deviceName?: string;
      deviceSerial?: string;
    }) => equipmentService.activateWithOtp(data),
    onSuccess: (updatedSlot, variables) => {
      invalidate();
      toast.success(t('devices.activateWithCodeSuccessTitle'), {
        description:
          t('devices.activateWithCodeSuccessDesc', { name: variables.deviceName }) ||
          `Device ${variables.deviceName} successfully activated with activation code.`,
      });
      return updatedSlot;
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error'), {
        description:
          error.response?.data?.message ||
          error.message ||
          t('devices.activateWithCodeFailed') ||
          'Failed to activate device with the provided code.',
      });
    },
  });

  const addDeviceMutation = useMutation({
    mutationFn: (data: {
      deviceName: string;
      deviceSerial?: string;
      tenantId?: string;
      otp: string;
    }) => equipmentService.addAdminDevice(data),
    onSuccess: (_result, variables) => {
      invalidate();
      toast.success(
        t('devices.addAdminDeviceSuccess', { name: variables.deviceName }) ||
          'Device added successfully',
        {
          description:
            t('devices.addAdminDeviceSuccessDesc') ||
            `Device ${variables.deviceName} has been registered and provisioned.`,
        },
      );
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error'), {
        description: error.response?.data?.message || error.message || 'Failed to add device.',
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (equipmentId: string) => equipmentService.deleteAdminDevice(equipmentId),
    onSuccess: () => {
      invalidate();
      toast.success(t('devices.deleteSuccess') || 'Device deleted successfully');
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error'), {
        description: error.response?.data?.message || error.message || 'Failed to delete device.',
      });
    },
  });

  return {
    loading,
    activeSubscriptions,
    subscriptionEquipment,
    adminDevices,
    queries: { adminQuery, subscriptionsQuery, devicesQuery },
    mutations: {
      deactivate: deactivateMutation,
      repair: repairMutation,
      activate: activateMutation,
      addDevice: addDeviceMutation,
      deleteDevice: deleteDeviceMutation,
    },
  };
}

/**
 * Fetches Vaultwarden password management details and status for a specific equipment slot.
 *
 * @param equipmentId - Equipment slot UUID
 */
export function useDeviceVault(equipmentId?: string) {
  return useQuery({
    queryKey: equipmentId ? EQUIPMENT_QUERY_KEYS.vault(equipmentId) : ['equipment', 'vault', 'none'],
    queryFn: () => equipmentService.getDeviceVault(equipmentId!),
    enabled: Boolean(equipmentId),
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to provision a Vaultwarden collection and device identity for an equipment slot.
 */
export function useProvisionDeviceVault() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (equipmentId: string) => equipmentService.provisionDeviceVault(equipmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.vault(data.equipmentId) });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
      toast.success(t('equipment.vault.provisionSuccessTitle', 'Vault Provisioned'), {
        description: t('equipment.vault.provisionSuccessDesc', 'Device vault has been configured and connected.'),
      });
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error', 'Error'), {
        description: error.response?.data?.message || error.message || t('equipment.vault.provisionError', 'Failed to provision device vault.'),
      });
    },
  });
}

/**
 * Mutation hook to revoke and lock active Vaultwarden credentials for an equipment slot.
 */
export function useRevokeDeviceVault() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ equipmentId, reason }: { equipmentId: string; reason?: string }) =>
      equipmentService.revokeDeviceVault(equipmentId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.vault(data.equipmentId) });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
      toast.warning(t('equipment.vault.revokeSuccessTitle', 'Vault Session Revoked'), {
        description: t('equipment.vault.revokeSuccessDesc', 'Device credentials locked and active session terminated.'),
      });
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error', 'Error'), {
        description: error.response?.data?.message || error.message || t('equipment.vault.revokeError', 'Failed to revoke device vault.'),
      });
    },
  });
}

/**
 * Mutation hook to reset the master password activation token for an equipment slot.
 */
export function useResetDeviceVault() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (equipmentId: string) => equipmentService.resetDeviceVault(equipmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.vault(data.equipmentId) });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
      toast.success(t('equipment.vault.resetSuccessTitle', 'Reset Link Generated'), {
        description: t(
          'equipment.vault.resetSuccessDesc',
          'Fresh master password activation token generated. You can now set a new password for this workstation.'
        ),
      });
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error', 'Error'), {
        description: error.response?.data?.message || error.message || t('equipment.vault.resetError', 'Failed to reset device vault.'),
      });
    },
  });
}

/**
 * Mutation hook to trigger an autonomous self-upgrade on a remote endpoint agent.
 */
export function useUpgradeAgent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ equipmentId, targetVersion }: { equipmentId: string; targetVersion?: string }) =>
      equipmentService.upgradeAgent(equipmentId, targetVersion),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_QUERY_KEYS.all });
      toast.success(t('equipment.upgrade.successTitle', 'Agent Upgrade Initiated'), {
        description: t(
          'equipment.upgrade.successDesc',
          `OTA upgrade to v${data.targetVersion} has been dispatched. Agent will hot-swap and restart.`
        ),
      });
    },
    onError: (err: Error) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t('common.error', 'Error'), {
        description:
          error.response?.data?.message ||
          error.message ||
          t('equipment.upgrade.error', 'Failed to initiate agent upgrade.'),
      });
    },
  });
}
