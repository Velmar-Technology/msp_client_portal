import { z } from 'zod';

/**
 * Lifecycle status of a device-bound password vault.
 */
export const DeviceVaultStatusSchema = z.enum([
  'UNPROVISIONED',
  'ACTIVE',
  'LOCKED',
  'PURGED',
]);
export type DeviceVaultStatus = z.infer<typeof DeviceVaultStatusSchema>;

/**
 * Details of a device-bound Vaultwarden vault.
 */
export const DeviceVaultDetailsSchema = z.object({
  equipmentId: z.string().uuid(),
  deviceName: z.string().nullable().optional(),
  status: DeviceVaultStatusSchema,
  orgId: z.string().nullable().optional(),
  collectionId: z.string().nullable().optional(),
  deviceEmail: z.string().nullable().optional(),
  lastSyncedAt: z.string().nullable().optional(),
  itemCount: z.number().int().nonnegative().default(0),
  message: z.string().optional(),
});
export type DeviceVaultDetails = z.infer<typeof DeviceVaultDetailsSchema>;

/**
 * Input schema for provisioning a device-bound password vault.
 */
export const ProvisionDeviceVaultInputSchema = z.object({
  equipmentId: z.string().uuid(),
});
export type ProvisionDeviceVaultInput = z.infer<typeof ProvisionDeviceVaultInputSchema>;

/**
 * Input schema for revoking or locking a device-bound password vault.
 */
export const RevokeDeviceVaultInputSchema = z.object({
  equipmentId: z.string().uuid(),
  reason: z.string().max(255).optional(),
});
export type RevokeDeviceVaultInput = z.infer<typeof RevokeDeviceVaultInputSchema>;

/**
 * Input schema for resetting and re-enrolling a device-bound password vault.
 */
export const ResetDeviceVaultInputSchema = z.object({
  equipmentId: z.string().uuid(),
});
export type ResetDeviceVaultInput = z.infer<typeof ResetDeviceVaultInputSchema>;
