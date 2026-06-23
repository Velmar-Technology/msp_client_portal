import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    subFindById: vi.fn(),
    equipFindBySubscription: vi.fn(),
    equipFindBySlot: vi.fn(),
    equipFindByOtp: vi.fn(),
    equipCreate: vi.fn(),
    equipUpdate: vi.fn(),
    planFindById: vi.fn(),
    ncProvisionUser: vi.fn(),
    ncDeleteUser: vi.fn(),
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findById: mocks.subFindById,
    },
  };
});

vi.mock('../repositories/EquipmentRepository', () => {
  return {
    equipmentRepository: {
      findBySubscription: mocks.equipFindBySubscription,
      findBySlot: mocks.equipFindBySlot,
      findByOtp: mocks.equipFindByOtp,
      create: mocks.equipCreate,
      update: mocks.equipUpdate,
    },
  };
});

vi.mock('../repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
    },
  };
});

vi.mock('./NextcloudService', () => {
  return {
    nextcloudService: {
      provisionUser: mocks.ncProvisionUser,
      deleteUser: mocks.ncDeleteUser,
    },
  };
});

import { equipmentService } from './EquipmentService';

describe('EquipmentService', () => {
  const tenantId = 'tenant-123';
  const subId = 'sub-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEquipmentSlots', () => {
    it('should return existing slots and not create new ones if slot count matches equipment_count', async () => {
      const mockSub = { id: subId, tenant_id: tenantId, equipment_count: 2 };
      const mockSlots = [
        { id: '1', slot_index: 0, status: 'ACTIVE' },
        { id: '2', slot_index: 1, status: 'PENDING_ACTIVATION' },
      ];

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySubscription.mockResolvedValue(mockSlots);

      const result = await equipmentService.getEquipmentSlots(subId, tenantId);

      expect(result).toHaveLength(2);
      expect(mocks.equipCreate).not.toHaveBeenCalled();
    });

    it('should initialize missing slots if database count is less than equipment_count', async () => {
      const mockSub = { id: subId, tenant_id: tenantId, equipment_count: 3 };
      const mockSlots = [
        { id: '1', slot_index: 0, status: 'ACTIVE', tenant_id: tenantId },
      ];

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySubscription.mockResolvedValue(mockSlots);
      mocks.equipCreate.mockImplementation((data) => Promise.resolve({ id: `new-${data.slot_index}`, ...data }));

      const result = await equipmentService.getEquipmentSlots(subId, tenantId);

      expect(result).toHaveLength(3);
      expect(mocks.equipCreate).toHaveBeenCalledTimes(2); // slot 1 and 2 created
    });
  });

  describe('generateSlotOTP', () => {
    it('should generate a 6 digit OTP and expiration date', async () => {
      const mockSub = { id: subId, tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySubscription.mockResolvedValue([mockSlot]);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const result = await equipmentService.generateSlotOTP(subId, 0, tenantId);

      expect(result.otp).toMatch(/^\d{6}$/);
      expect(result.otp_expires_at).toBeInstanceOf(Date);
      expect(mocks.equipUpdate).toHaveBeenCalled();
    });
  });

  describe('activateSlot', () => {
    it('should provision a user in Nextcloud and activate the slot', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncProvisionUser.mockResolvedValue('randomPass123');
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const result = await equipmentService.activateSlot({
        subscriptionId: subId,
        slotIndex: 0,
        deviceName: 'Workstation 1',
        deviceSerial: 'SN12345',
        tenantId,
      });

      expect(result.status).toBe('ACTIVE');
      expect(result.device_name).toBe('Workstation 1');
      expect(result.device_serial).toBe('SN12345');
      expect(result.nextcloud_password).toBe('randomPass123');
      expect(mocks.ncProvisionUser).toHaveBeenCalledWith({
        username: `client_tenant-1_slot_1`,
        quota: '50 GB',
        displayName: 'Workstation 1 (SN12345)',
      });
    });
  });

  describe('deactivateSlot', () => {
    it('should delete user from Nextcloud and clear slot in database', async () => {
      const mockSlot = { 
        id: 'slot-1', 
        slot_index: 0, 
        status: 'ACTIVE', 
        nextcloud_username: 'client_tenant-1_slot_1',
        tenant_id: tenantId 
      };

      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncDeleteUser.mockResolvedValue(undefined);
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const result = await equipmentService.deactivateSlot(subId, 0, tenantId);

      expect(mocks.ncDeleteUser).toHaveBeenCalledWith('client_tenant-1_slot_1');
      expect(result.status).toBe('PENDING_ACTIVATION');
      expect(result.device_name).toBeNull();
      expect(result.nextcloud_username).toBeNull();
    });
  });
});
