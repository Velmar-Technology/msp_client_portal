import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    subFindById: vi.fn(),
    equipFindBySubscription: vi.fn(),
    equipFindBySlot: vi.fn(),
    equipFindByOtp: vi.fn(),
    equipCreate: vi.fn(),
    equipUpdate: vi.fn(),
    equipFindAllWithDetails: vi.fn(),
    equipFindActiveByClient: vi.fn(),
    planFindById: vi.fn(),
    ncProvisionUser: vi.fn(),
    ncDeleteUser: vi.fn(),
    ncGetUserStorage: vi.fn(),
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
      findAllWithDetails: mocks.equipFindAllWithDetails,
      findActiveByClient: mocks.equipFindActiveByClient,
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
      getUserStorage: mocks.ncGetUserStorage,
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

    it('should bypass tenant check if byAdmin is true', async () => {
      const mockSub = { id: subId, tenant_id: 'different-tenant-id', equipment_count: 1 };
      const mockSlots = [
        { id: '1', slot_index: 0, status: 'ACTIVE', tenant_id: 'different-tenant-id' },
      ];

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySubscription.mockResolvedValue(mockSlots);

      // Should not throw with byAdmin = true
      const result = await equipmentService.getEquipmentSlots(subId, tenantId, true);
      expect(result).toHaveLength(1);
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

      const result = await equipmentService.generateSlotOTP(subId, 0, tenantId, true);

      expect(result.otp).toMatch(/^\d{6}$/);
      expect(result.otp_expires_at).toBeInstanceOf(Date);
      expect(mocks.equipUpdate).toHaveBeenCalled();
    });

    it('should reject if non-admin/client attempts to generate OTP', async () => {
      await expect(equipmentService.generateSlotOTP(subId, 0, tenantId, false)).rejects.toThrow(
        'Client users are not authorized to generate activation codes'
      );
    });

    it('should bypass tenant check if byAdmin is true', async () => {
      const mockSub = { id: subId, tenant_id: 'different-tenant-id', equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: 'different-tenant-id' };

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySubscription.mockResolvedValue([mockSlot]);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const result = await equipmentService.generateSlotOTP(subId, 0, tenantId, true);
      expect(result.otp).toMatch(/^\d{6}$/);
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

    it('should bypass tenant check if byAdmin option is true', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: 'different-tenant-id', equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: 'different-tenant-id' };

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
        byAdmin: true,
      });

      expect(result.status).toBe('ACTIVE');
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

    it('should bypass tenant check if byAdmin is true', async () => {
      const mockSlot = { 
        id: 'slot-1', 
        slot_index: 0, 
        status: 'ACTIVE', 
        nextcloud_username: 'client_tenant-1_slot_1',
        tenant_id: 'different-tenant-id'
      };

      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncDeleteUser.mockResolvedValue(undefined);
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const result = await equipmentService.deactivateSlot(subId, 0, tenantId, true);
      expect(result.status).toBe('PENDING_ACTIVATION');
    });
  });

  describe('getActiveDevicesForClient', () => {
    it('should delegate to findActiveByClient with the client id and tenant id', async () => {
      const clientId = 'client-123';
      const mockDevices = [
        {
          id: 'slot-1',
          subscription_id: subId,
          slot_index: 0,
          status: 'ACTIVE',
          device_name: 'Workstation Alpha',
          tenant_id: tenantId,
        },
      ];

      mocks.equipFindActiveByClient.mockResolvedValue(mockDevices);

      const result = await equipmentService.getActiveDevicesForClient(clientId, tenantId);

      expect(mocks.equipFindActiveByClient).toHaveBeenCalledWith(clientId, tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].device_name).toBe('Workstation Alpha');
    });

    it('should surface devices for EXPIRING subscriptions (filtered by repository)', async () => {
      const clientId = 'client-123';
      const expiringDevices = [
        {
          id: 'slot-expiring',
          subscription_id: 'sub-expiring',
          slot_index: 0,
          status: 'ACTIVE',
          device_name: 'Expiring Plan Device',
          tenant_id: tenantId,
        },
      ];

      mocks.equipFindActiveByClient.mockResolvedValue(expiringDevices);

      const result = await equipmentService.getActiveDevicesForClient(clientId, tenantId);

      expect(result).toEqual(expiringDevices);
      expect(mocks.equipFindActiveByClient).toHaveBeenCalledWith(clientId, tenantId);
    });
  });

  describe('getAllDevicesForAdmin', () => {
    it('should fetch all devices without querying Nextcloud on load', async () => {
      const mockDevices = [
        {
          id: 'slot-1',
          status: 'ACTIVE',
          nextcloud_username: 'client_1_slot_1',
          tenant_name: 'Tenant A',
          client_name: 'Client A',
        },
        {
          id: 'slot-2',
          status: 'PENDING_ACTIVATION',
          nextcloud_username: null,
          tenant_name: 'Tenant B',
          client_name: 'Client B',
        }
      ];

      mocks.equipFindAllWithDetails.mockResolvedValue(mockDevices);

      const result = await equipmentService.getAllDevicesForAdmin();

      expect(mocks.equipFindAllWithDetails).toHaveBeenCalled();
      expect(mocks.ncGetUserStorage).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('getNextcloudInfo', () => {
    it('should fetch Nextcloud storage info on demand for an active slot', async () => {
      const mockSlot = {
        id: 'slot-1',
        subscription_id: subId,
        slot_index: 0,
        status: 'ACTIVE',
        nextcloud_username: 'client_1_slot_1',
        nextcloud_password: 'secret_password',
        device_name: 'Workstation Alpha',
        device_serial: 'SN-001',
        tenant_id: tenantId,
      };

      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncGetUserStorage.mockResolvedValue({ used: 2048, total: 10240 });

      const result = await equipmentService.getNextcloudInfo(subId, 0, tenantId);

      expect(mocks.equipFindBySlot).toHaveBeenCalledWith(subId, 0);
      expect(mocks.ncGetUserStorage).toHaveBeenCalledWith('client_1_slot_1');
      expect(result.nextcloud_username).toBe('client_1_slot_1');
      expect(result.nextcloud_password).toBe('secret_password');
      expect(result.nextcloud_used_bytes).toBe(2048);
      expect(result.nextcloud_total_bytes).toBe(10240);
    });
  });
});
