import { z } from 'zod';

export const ActivateWithOtpDTO = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Activation code (OTP) must be a 6-digit numeric code'),
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  slotIndex: z.number().int().min(0, 'Slot index must be a non-negative integer'),
  deviceName: z.string().trim().min(1).max(255).optional(),
  deviceSerial: z.string().trim().min(1).max(255).optional(),
});
export type ActivateWithOtpInput = z.infer<typeof ActivateWithOtpDTO>;

export const SlotParamsDTO = z.object({
  subId: z.string().uuid('Invalid subscription ID'),
  slotIndex: z.coerce.number().int().min(0, 'Slot index must be a non-negative integer'),
});
export type SlotParamsInput = z.infer<typeof SlotParamsDTO>;

export const AddAdminDeviceDTO = z.object({
  deviceName: z.string().trim().min(1, 'Device name is required').max(255),
  deviceSerial: z.string().trim().min(1).max(255).optional(),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
  otp: z.string().regex(/^\d{6}$/, 'Activation code (OTP) must be a 6-digit numeric code'),
});
export type AddAdminDeviceInput = z.infer<typeof AddAdminDeviceDTO>;