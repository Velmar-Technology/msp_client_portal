import { describe, it, expect } from 'vitest';
import {
  ActivateWithOtpInputSchema,
  SlotParamsSchema,
  AddAdminDeviceInputSchema,
  SubscriptionEquipmentSchema,
} from './equipment.contract';

describe('Equipment Contract Schemas', () => {
  describe('ActivateWithOtpInputSchema', () => {
    it('accepts valid 6-digit OTP and UUID subscription ID', () => {
      const valid = {
        otp: '123456',
        subscriptionId: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
        slotIndex: 0,
        deviceName: 'Workstation-1',
      };
      const result = ActivateWithOtpInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects OTP with non-digits or wrong length', () => {
      expect(
        ActivateWithOtpInputSchema.safeParse({
          otp: '12345', // 5 digits
          subscriptionId: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
          slotIndex: 0,
        }).success
      ).toBe(false);

      expect(
        ActivateWithOtpInputSchema.safeParse({
          otp: '12345A', // letters
          subscriptionId: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
          slotIndex: 0,
        }).success
      ).toBe(false);
    });

    it('rejects negative slot index', () => {
      const result = ActivateWithOtpInputSchema.safeParse({
        otp: '123456',
        subscriptionId: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
        slotIndex: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SlotParamsSchema', () => {
    it('coerces string slotIndex to integer', () => {
      const result = SlotParamsSchema.safeParse({
        subId: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
        slotIndex: '2',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slotIndex).toBe(2);
      }
    });

    it('rejects invalid subId UUID', () => {
      const result = SlotParamsSchema.safeParse({
        subId: 'not-a-uuid',
        slotIndex: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SubscriptionEquipmentSchema', () => {
    it('validates a complete hardware entity', () => {
      const device = {
        id: '9f2e3089-9a2c-47ea-8dcf-cb9192f15eb7',
        subscription_id: 'b6e3f438-6cfb-4a52-9be2-5e6a9871fa14',
        slot_index: 0,
        status: 'ACTIVE',
        device_name: 'HQ-Laptop-01',
        device_serial: 'SN-94821',
        tenant_id: '11111111-2222-3333-4444-555555555555',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const result = SubscriptionEquipmentSchema.safeParse(device);
      expect(result.success).toBe(true);
    });
  });
});
