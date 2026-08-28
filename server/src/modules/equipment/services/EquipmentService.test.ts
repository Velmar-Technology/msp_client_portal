import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    subFindById: vi.fn(),
    subFindAllActive: vi.fn(),
    subFindByTenant: vi.fn(),
    subCreate: vi.fn(),
    subUpdatePlan: vi.fn(),
    equipFindBySubscription: vi.fn(),
    equipFindBySlot: vi.fn(),
    equipFindByOtp: vi.fn(),
    equipFindById: vi.fn(),
    equipUpdateAgentIdentity: vi.fn(),
    equipCreate: vi.fn(),
    equipUpdate: vi.fn(),
    equipFindAllWithDetails: vi.fn(),
    equipFindActiveByClient: vi.fn(),
    equipFindByIdWithDetails: vi.fn(),
    equipDeleteById: vi.fn(),
    planFindById: vi.fn(),
    ncProvisionUser: vi.fn(),
    ncDeleteUser: vi.fn(),
    ncGetUserStorage: vi.fn(),
    equipFindByAgentInstanceId: vi.fn(),
    gatewayGetPairingByCode: vi.fn(),
    gatewayBindAgent: vi.fn(),
  };
});

vi.mock('@modules/rmm/services/AgentGateway', () => {
  return {
    agentGateway: {
      getPairingByCode: mocks.gatewayGetPairingByCode,
      bindAgent: mocks.gatewayBindAgent,
    },
  };
});

vi.mock('@modules/subscriptions/repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findById: mocks.subFindById,
      findAllActive: mocks.subFindAllActive,
      findByTenant: mocks.subFindByTenant,
      create: mocks.subCreate,
      updatePlan: mocks.subUpdatePlan,
    },
  };
});

vi.mock('@modules/equipment/repositories/EquipmentRepository', () => {
  return {
    equipmentRepository: {
      findBySubscription: mocks.equipFindBySubscription,
      findBySlot: mocks.equipFindBySlot,
      findByOtp: mocks.equipFindByOtp,
      findById: mocks.equipFindById,
      findByAgentInstanceId: mocks.equipFindByAgentInstanceId,
      updateAgentIdentity: mocks.equipUpdateAgentIdentity,
      create: mocks.equipCreate,
      update: mocks.equipUpdate,
      findAllWithDetails: mocks.equipFindAllWithDetails,
      findActiveByClient: mocks.equipFindActiveByClient,
      findByIdWithDetails: mocks.equipFindByIdWithDetails,
      deleteById: mocks.equipDeleteById,
    },
  };
});

vi.mock('@modules/subscriptions/repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
    },
  };
});

vi.mock('@modules/system/services/NextcloudService', () => {
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

  describe('bindAndActivateSlot', () => {
    const pairingEntry = (overrides: any = {}) => ({
      agentId: 'agent-abc',
      hello: {
        agent_id: 'agent-abc',
        hostname: 'LAPTOP-X',
        serial_number: 'SN-A500',
        manufacturer: 'Lenovo',
        system_model: 'ThinkPad T14',
        reported_at: new Date().toISOString(),
        ...(overrides.hello || {}),
      },
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    });

    it('should bind the agent to the slot and activate it using agent-provided identity', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncProvisionUser.mockResolvedValue('randomPass123');
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
      mocks.gatewayBindAgent.mockReturnValue(true);

      const result = await equipmentService.bindAndActivateSlot({
        code: '123456',
        subscriptionId: subId,
        slotIndex: 0,
        tenantId,
      });

      expect(result.status).toBe('ACTIVE');
      expect(result.device_name).toBe('LAPTOP-X');
      expect(result.device_serial).toBe('SN-A500');
      expect(result.agent_instance_id).toBe('agent-abc');
      expect(result.nextcloud_password).toBe('randomPass123');
      expect(mocks.ncProvisionUser).toHaveBeenCalledWith({
        username: `client_tenant-1_slot_1`,
        quota: '50 GB',
        displayName: 'LAPTOP-X (SN-A500)',
      });
      expect(mocks.gatewayBindAgent).toHaveBeenCalledWith(
        'agent-abc',
        'slot-1',
        expect.stringMatching(/^[a-f0-9]{64}$/)
      );
      expect(result).not.toHaveProperty('agent_token');
    });

    it('should fall back to provided/derived device fields when the agent reports no identity', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.gatewayGetPairingByCode.mockReturnValue(
        pairingEntry({ hello: { agent_id: 'agent-abc', reported_at: new Date().toISOString() } })
      );
      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncProvisionUser.mockResolvedValue('randomPass123');
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
      mocks.gatewayBindAgent.mockReturnValue(true);

      const result = await equipmentService.bindAndActivateSlot({
        code: '123456',
        subscriptionId: subId,
        slotIndex: 0,
        deviceName: 'Manual Device',
        deviceSerial: 'SN-MANUAL',
        tenantId,
      });

      expect(result.device_name).toBe('Manual Device');
      expect(result.device_serial).toBe('SN-MANUAL');
    });

    it('should throw NotFoundError when the pairing code is unknown', async () => {
      mocks.gatewayGetPairingByCode.mockReturnValue(null);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '000000', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Activation code (OTP) not found or invalid');
      expect(mocks.equipUpdate).not.toHaveBeenCalled();
    });

    it('should throw when the slot does not exist', async () => {
      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(null);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Equipment slot not found');
    });

    it('should deny non-admin binding to another tenant slot', async () => {
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: 'different-tenant-id' };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Access denied');
      expect(mocks.ncProvisionUser).not.toHaveBeenCalled();
    });

    it('should allow admins to bind any tenant slot', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: 'different-tenant-id', equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: 'different-tenant-id' };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.ncProvisionUser.mockResolvedValue('randomPass123');
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
      mocks.gatewayBindAgent.mockReturnValue(true);

      const result = await equipmentService.bindAndActivateSlot({
        code: '123456',
        subscriptionId: subId,
        slotIndex: 0,
        tenantId,
        byAdmin: true,
      });

      expect(result.status).toBe('ACTIVE');
    });

    it('should reject activation of an already-active slot', async () => {
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'ACTIVE', tenant_id: tenantId };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Slot is already active');
    });

    it('should reject a slot already bound to a different agent', async () => {
      const mockSlot = {
        id: 'slot-1',
        slot_index: 0,
        status: 'PENDING_ACTIVATION',
        tenant_id: tenantId,
        agent_instance_id: 'agent-other',
      };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Slot is already bound to a different agent');
    });

    it('should throw ExternalServiceError without touching the slot when Nextcloud provisioning fails', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.ncProvisionUser.mockRejectedValue(new Error('compromised password'));

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Failed to provision Nextcloud user credentials');
      expect(mocks.equipUpdate).not.toHaveBeenCalled();
      expect(mocks.gatewayBindAgent).not.toHaveBeenCalled();
    });

    it('should roll back the slot and clean up Nextcloud when the agent goes offline before BIND', async () => {
      const mockSub = { id: subId, plan: 'PL-002', tenant_id: tenantId, equipment_count: 1 };
      const mockSlot = { id: 'slot-1', slot_index: 0, status: 'PENDING_ACTIVATION', tenant_id: tenantId };

      mocks.gatewayGetPairingByCode.mockReturnValue(pairingEntry());
      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.equipFindBySlot.mockResolvedValue(mockSlot);
      mocks.ncProvisionUser.mockResolvedValue('randomPass123');
      mocks.equipUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
      mocks.gatewayBindAgent.mockReturnValue(false);

      await expect(
        equipmentService.bindAndActivateSlot({ code: '123456', subscriptionId: subId, slotIndex: 0, tenantId })
      ).rejects.toThrow('Agent went offline');
      expect(mocks.equipUpdate).toHaveBeenCalledTimes(2);
      expect(mocks.ncDeleteUser).toHaveBeenCalledWith(`client_tenant-1_slot_1`);
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

      mocks.subFindAllActive.mockResolvedValue([]);
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

  describe('resolveStorageQuota', () => {
    it('should return 25 GB for PL-001 plan', async () => {
      const quota = await equipmentService.resolveStorageQuota('PL-001');
      expect(quota).toBe('25 GB');
    });

    it('should return 50 GB for PL-002 plan', async () => {
      const quota = await equipmentService.resolveStorageQuota('PL-002');
      expect(quota).toBe('50 GB');
    });

    it('should return 100 GB for PL-003 plan', async () => {
      const quota = await equipmentService.resolveStorageQuota('PL-003');
      expect(quota).toBe('100 GB');
    });

    it('should query plan repository and parse storage text for unknown plan IDs', async () => {
      mocks.planFindById.mockResolvedValue({
        id: 'CUSTOM-PLAN',
        features: [{ code: 'CLOUD_STORAGE', params: { limit: 500, unit: 'GB' } }],
      });
      const quota = await equipmentService.resolveStorageQuota('CUSTOM-PLAN');
      expect(quota).toBe('500 GB');
    });
  });

  describe('addAdminDevice', () => {
    it('should create an internal admin subscription if tenant has no active subscription and provision slot', async () => {
      mocks.subFindByTenant.mockResolvedValue([]);
      mocks.subCreate.mockResolvedValue({
        id: 'sub-new-admin',
        tenant_id: tenantId,
        service_name: 'Admin Infrastructure',
        plan: 'PL-003',
        equipment_count: 50,
        status: 'ACTIVE',
      });
      mocks.equipFindBySubscription.mockResolvedValue([]);
      mocks.ncProvisionUser.mockResolvedValue('nc_password_123');
      mocks.equipCreate.mockResolvedValue({
        id: 'slot-admin-1',
        subscription_id: 'sub-new-admin',
        slot_index: 0,
        status: 'ACTIVE',
        device_name: 'Core Server',
        device_serial: 'SN-ADM-001',
        nextcloud_username: `admin_${tenantId.slice(0, 8)}_slot_1`,
        nextcloud_password: 'nc_password_123',
        tenant_id: tenantId,
      });

      const result = await equipmentService.addAdminDevice({
        deviceName: 'Core Server',
        deviceSerial: 'SN-ADM-001',
        tenantId,
        adminUserId: 'admin-1',
      });

      expect(mocks.subCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'admin-1',
          tenant_id: tenantId,
          service_name: 'Admin Infrastructure',
          status: 'ACTIVE',
        })
      );
      expect(mocks.equipCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_id: 'sub-new-admin',
          slot_index: 0,
          status: 'ACTIVE',
          device_name: 'Core Server',
          device_serial: 'SN-ADM-001',
        })
      );
      expect(result.device_name).toBe('Core Server');
    });

    it('should throw ValidationError if deviceName is empty', async () => {
      await expect(
        equipmentService.addAdminDevice({
          deviceName: '   ',
          tenantId,
          adminUserId: 'admin-1',
        })
      ).rejects.toThrow('Device name is required');
    });
  });

  describe('deleteAdminEquipment', () => {
    it('should delete admin-owned equipment successfully and cleanup Nextcloud', async () => {
      mocks.equipFindByIdWithDetails.mockResolvedValue({
        id: 'equip-adm-1',
        client_role: 'ADMIN',
        nextcloud_username: 'admin_user_slot_1',
        device_name: 'Core Server',
      });
      mocks.equipDeleteById.mockResolvedValue(true);

      const result = await equipmentService.deleteAdminEquipment('equip-adm-1', 'admin-1');

      expect(mocks.equipFindByIdWithDetails).toHaveBeenCalledWith('equip-adm-1');
      expect(mocks.ncDeleteUser).toHaveBeenCalledWith('admin_user_slot_1');
      expect(mocks.equipDeleteById).toHaveBeenCalledWith('equip-adm-1');
      expect(result).toEqual({ success: true, id: 'equip-adm-1' });
    });

    it('should throw NotFoundError if equipment is not found', async () => {
      mocks.equipFindByIdWithDetails.mockResolvedValue(null);

      await expect(
        equipmentService.deleteAdminEquipment('missing-id', 'admin-1')
      ).rejects.toThrow('Equipment not found');
    });

    it('should reject deleting client-owned equipment with ForbiddenError', async () => {
      mocks.equipFindByIdWithDetails.mockResolvedValue({
        id: 'equip-cli-1',
        client_role: 'CLIENT',
        device_name: 'Client Laptop',
      });

      await expect(
        equipmentService.deleteAdminEquipment('equip-cli-1', 'admin-1')
      ).rejects.toThrow('Only admin-owned equipment can be deleted');
    });
  });

  describe('reconcileAgentIdentity', () => {
    it('should overwrite device identity when the slot has no agent_token (lenient mode)', async () => {
      const slot = { id: 'slot-1', agent_token: null, tenant_id: tenantId };
      mocks.equipFindById.mockResolvedValue(slot);
      mocks.equipUpdateAgentIdentity.mockResolvedValue({ ...slot, device_name: 'SRV-01' });

      await equipmentService.reconcileAgentIdentity(
        'slot-1',
        { hostname: 'SRV-01', serial_number: 'CN-XYZ' },
        null
      );

      expect(mocks.equipFindById).toHaveBeenCalledWith('slot-1');
      expect(mocks.equipUpdateAgentIdentity).toHaveBeenCalledWith(
        'slot-1',
        expect.objectContaining({
          hostname: 'SRV-01',
          serial: 'CN-XYZ',
          lastSeenAt: expect.any(Date),
        })
      );
    });

    it('should reject the write when the presented token does not match the slot token', async () => {
      const slot = { id: 'slot-1', agent_token: 'secret-abc', tenant_id: tenantId };
      mocks.equipFindById.mockResolvedValue(slot);

      await equipmentService.reconcileAgentIdentity(
        'slot-1',
        { hostname: 'SRV-01', serial_number: 'CN-XYZ' },
        'wrong-secret'
      );

      expect(mocks.equipUpdateAgentIdentity).not.toHaveBeenCalled();
    });

    it('should apply the identity when the presented token matches the slot token', async () => {
      const slot = { id: 'slot-1', agent_token: 'secret-abc', tenant_id: tenantId };
      mocks.equipFindById.mockResolvedValue(slot);
      mocks.equipUpdateAgentIdentity.mockResolvedValue({ ...slot, device_name: 'SRV-01' });

      await equipmentService.reconcileAgentIdentity(
        'slot-1',
        { hostname: 'SRV-01', serial_number: 'CN-XYZ' },
        'secret-abc'
      );

      expect(mocks.equipUpdateAgentIdentity).toHaveBeenCalledTimes(1);
    });

    it('should no-op when no equipment record matches the agent id', async () => {
      mocks.equipFindById.mockResolvedValue(null);

      await equipmentService.reconcileAgentIdentity(
        'unknown-slot',
        { hostname: 'SRV-99' },
        null
      );

      expect(mocks.equipUpdateAgentIdentity).not.toHaveBeenCalled();
    });

    it('should no-op when the hello carries no hostname or serial', async () => {
      await equipmentService.reconcileAgentIdentity(
        'slot-1',
        { agent_version: '0.4.0' },
        null
      );

      expect(mocks.equipFindById).not.toHaveBeenCalled();
      expect(mocks.equipUpdateAgentIdentity).not.toHaveBeenCalled();
    });
  });

  describe('getAgentIdentityByOtp', () => {
    it('should return agent-discovered identity from the pairing registry', async () => {
      mocks.gatewayGetPairingByCode.mockReturnValue({
        agentId: 'agent-abc',
        hello: {
          agent_id: 'agent-abc',
          hostname: 'AGENT-SRV',
          serial_number: 'AGENT-SN',
          manufacturer: 'Dell',
          system_model: 'PowerEdge',
          timestamp: '2026-08-01T00:00:00.000Z',
        },
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await equipmentService.getAgentIdentityByOtp('123456', tenantId);

      expect(mocks.gatewayGetPairingByCode).toHaveBeenCalledWith('123456');
      expect(result.hostname).toBe('AGENT-SRV');
      expect(result.serial).toBe('AGENT-SN');
      expect(result.lastSeenAt).toBeInstanceOf(Date);
    });

    it('should return nulls when the agent reports no identity', async () => {
      mocks.gatewayGetPairingByCode.mockReturnValue({
        agentId: 'agent-abc',
        hello: { agent_id: 'agent-abc', reported_at: new Date().toISOString() },
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await equipmentService.getAgentIdentityByOtp('123456', tenantId);

      expect(result.hostname).toBeNull();
      expect(result.serial).toBeNull();
    });

    it('should throw NotFoundError when the activation code is unknown', async () => {
      mocks.gatewayGetPairingByCode.mockReturnValue(null);

      await expect(
        equipmentService.getAgentIdentityByOtp('000000', tenantId)
      ).rejects.toThrow('Activation code (OTP) not found or invalid');
    });
  });

  describe('resolveAgentIdForSlot', () => {
    it('should return the identifier unchanged when it is already an agent instance id', async () => {
      mocks.equipFindByAgentInstanceId.mockResolvedValue({ id: 'slot-1', agent_instance_id: 'agent-abc' });

      const result = await equipmentService.resolveAgentIdForSlot('agent-abc');
      expect(result).toBe('agent-abc');
    });

    it('should resolve a slot UUID to its bound agent instance', async () => {
      mocks.equipFindByAgentInstanceId.mockResolvedValue(null);
      mocks.equipFindById.mockResolvedValue({ id: 'slot-1', agent_instance_id: 'agent-abc' });

      const result = await equipmentService.resolveAgentIdForSlot('slot-1');
      expect(result).toBe('agent-abc');
    });

    it('should return the identifier unchanged when no binding exists', async () => {
      mocks.equipFindByAgentInstanceId.mockResolvedValue(null);
      mocks.equipFindById.mockResolvedValue(null);

      const result = await equipmentService.resolveAgentIdForSlot('slot-1');
      expect(result).toBe('slot-1');
    });
  });
});

