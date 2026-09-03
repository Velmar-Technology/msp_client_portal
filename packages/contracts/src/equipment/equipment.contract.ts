import { z } from 'zod';

/**
 * Status of an equipment / device slot
 */
export const EquipmentStatusSchema = z.enum(['PENDING_ACTIVATION', 'ACTIVE']);
export type EquipmentStatus = z.infer<typeof EquipmentStatusSchema>;

/**
 * Input schema for activating an equipment slot via 6-digit OTP
 */
export const ActivateWithOtpInputSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Activation code (OTP) must be a 6-digit numeric code'),
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  slotIndex: z.number().int().min(0, 'Slot index must be a non-negative integer'),
  deviceName: z.string().trim().min(1).max(255).optional(),
  deviceSerial: z.string().trim().min(1).max(255).optional(),
});

export type ActivateWithOtpInput = z.infer<typeof ActivateWithOtpInputSchema>;

/**
 * URL parameter schema for slot-scoped operations
 */
export const SlotParamsSchema = z.object({
  subId: z.string().uuid('Invalid subscription ID'),
  slotIndex: z.coerce.number().int().min(0, 'Slot index must be a non-negative integer'),
});

export type SlotParams = z.infer<typeof SlotParamsSchema>;

/**
 * Admin device enrollment payload
 */
export const AddAdminDeviceInputSchema = z.object({
  deviceName: z.string().trim().min(1, 'Device name is required').max(255),
  deviceSerial: z.string().trim().min(1).max(255).optional(),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
  otp: z.string().regex(/^\d{6}$/, 'Activation code (OTP) must be a 6-digit numeric code'),
});

export type AddAdminDeviceInput = z.infer<typeof AddAdminDeviceInputSchema>;

/**
 * Complete hardware equipment entity schema matching database and telemetry view
 */
export const SubscriptionEquipmentSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  slot_index: z.number().int().min(0),
  status: EquipmentStatusSchema,
  device_name: z.string().nullable(),
  device_serial: z.string().nullable(),
  agent_instance_id: z.string().nullable().optional(),
  agent_hostname: z.string().nullable().optional(),
  agent_serial: z.string().nullable().optional(),
  agent_last_seen_at: z.string().nullable().optional(),
  otp: z.string().nullable().optional(),
  otp_expires_at: z.string().nullable().optional(),
  nextcloud_username: z.string().nullable().optional(),
  nextcloud_password: z.string().nullable().optional(),
  vaultwarden_org_id: z.string().nullable().optional(),
  vaultwarden_collection_id: z.string().nullable().optional(),
  vaultwarden_device_user_id: z.string().nullable().optional(),
  vaultwarden_status: z.string().nullable().optional(),
  vaultwarden_last_synced_at: z.string().nullable().optional(),
  tenant_id: z.string().uuid(),
  nextcloud_used_bytes: z.number().optional(),
  nextcloud_total_bytes: z.number().optional(),
  agent_status: z.string().nullable().optional(),
  cpu_usage: z.number().nullable().optional(),
  memory_usage: z.number().nullable().optional(),
  disk_usage: z.union([z.number(), z.string()]).nullable().optional(),
  disk_used_gb: z.union([z.number(), z.string()]).nullable().optional(),
  disk_total_gb: z.union([z.number(), z.string()]).nullable().optional(),
  pending_patch_count: z.number().nullable().optional(),
  uptime: z.union([z.string(), z.number()]).nullable().optional(),
  uptime_seconds: z.number().nullable().optional(),
  last_sync_at: z.string().nullable().optional(),
  monthly_ticket_count: z.number().optional(),
  monthly_ticket_limit: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  client_name: z.string().optional(),
  client_email: z.string().optional(),
  client_role: z.string().optional(),
  service_name: z.string().optional(),
  plan: z.string().optional(),
  tenant_name: z.string().optional(),
  subscription_status: z.string().optional(),
});

export type SubscriptionEquipment = z.infer<typeof SubscriptionEquipmentSchema>;
