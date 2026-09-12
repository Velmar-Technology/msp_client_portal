import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentService } from './EquipmentService';
import { NotFoundError, ForbiddenError } from '@shared/errors';

describe('EquipmentService - Device-Bound Vaultwarden Management', () => {
  let equipmentService: EquipmentService;
  let mockEquipmentRepo: any;
  let mockSubRepo: any;
  let mockPlanRepo: any;
  let mockVaultwardenSvc: any;

  const mockEquipment = {
    id: 'a0000000-0000-0000-0000-000000000001',
    subscription_id: 'b0000000-0000-0000-0000-000000000001',
    tenant_id: 'c0000000-0000-0000-0000-000000000001',
    slot_index: 0,
    device_name: 'POS-Terminal-01',
    vaultwarden_status: 'UNPROVISIONED',
    vaultwarden_org_id: null,
    vaultwarden_collection_id: null,
    vaultwarden_device_user_id: null,
    vaultwarden_last_synced_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEquipmentRepo = {
      findById: vi.fn().mockResolvedValue({ ...mockEquipment }),
      update: vi.fn().mockImplementation((id: string, data: any) =>
        Promise.resolve({ ...mockEquipment, ...data, id })
      ),
    };

    mockSubRepo = {
      findById: vi.fn().mockResolvedValue({
        id: mockEquipment.subscription_id,
        plan: 'PL-003',
      }),
    };

    mockPlanRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'PL-003',
        features: [
          { code: 'PASSWORD_MANAGER', included: true },
        ],
      }),
    };

    mockVaultwardenSvc = {
      createDeviceCollection: vi.fn().mockResolvedValue('vw_col_123'),
      provisionDeviceAccount: vi.fn().mockResolvedValue({
        userId: 'vw_user_456',
        activationUrl: 'https://helpdesk.velmartech.com.do/vault/#/accept-organization/?token=mock',
      }),
      revokeDeviceSession: vi.fn().mockResolvedValue(true),
      checkUserAccountStatus: vi.fn().mockResolvedValue({ isActivated: false, status: 1 }),
      generateDeviceActivationUrl: vi.fn().mockReturnValue(
        'https://helpdesk.velmartech.com.do/vault/#/accept-organization/?token=mock'
      ),
    };

    equipmentService = new EquipmentService(
      mockEquipmentRepo as any,
      mockSubRepo as any,
      mockPlanRepo as any,
      {} as any,
      {} as any,
      {} as any,
      mockVaultwardenSvc as any
    );
  });

  describe('getDeviceVault', () => {
    it('returns UNPROVISIONED details for fresh equipment slot', async () => {
      const res = await equipmentService.getDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id
      );

      expect(res.equipmentId).toBe(mockEquipment.id);
      expect(res.deviceName).toBe('POS-Terminal-01');
      expect(res.status).toBe('UNPROVISIONED');
      expect(res.collectionId).toBeNull();
      expect(res.deviceEmail).toContain('@');
      expect(mockEquipmentRepo.findById).toHaveBeenCalledWith(mockEquipment.id);
    });

    it('throws NotFoundError if equipment slot does not exist', async () => {
      mockEquipmentRepo.findById.mockResolvedValueOnce(null);

      await expect(
        equipmentService.getDeviceVault('non-existent-id', mockEquipment.tenant_id)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if equipment slot belongs to another tenant', async () => {
      await expect(
        equipmentService.getDeviceVault(mockEquipment.id, 'different-tenant-uuid')
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows admin to query equipment belonging to any tenant', async () => {
      const res = await equipmentService.getDeviceVault(
        mockEquipment.id,
        'different-tenant-uuid',
        true
      );

      expect(res.equipmentId).toBe(mockEquipment.id);
      expect(res.status).toBe('UNPROVISIONED');
    });
  });

  describe('provisionDeviceVault', () => {
    it('creates collection, provisions device account, and updates equipment record', async () => {
      const res = await equipmentService.provisionDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id
      );

      expect(mockVaultwardenSvc.createDeviceCollection).toHaveBeenCalledWith(
        mockEquipment.tenant_id,
        'POS-Terminal-01'
      );
      expect(mockVaultwardenSvc.provisionDeviceAccount).toHaveBeenCalledWith(
        mockEquipment.tenant_id,
        'vw_col_123',
        expect.stringContaining('device_')
      );
      expect(mockEquipmentRepo.update).toHaveBeenCalledWith(
        mockEquipment.id,
        expect.objectContaining({
          vaultwarden_status: 'ACTIVE',
          vaultwarden_collection_id: 'vw_col_123',
          vaultwarden_device_user_id: 'vw_user_456',
        })
      );
      expect(res.status).toBe('ACTIVE');
      expect(res.collectionId).toBe('vw_col_123');
      expect(res.itemCount).toBe(1);
    });

    it('re-enrolls a previously locked device slot by passing existing collection and user ID', async () => {
      mockEquipmentRepo.findById.mockResolvedValueOnce({
        ...mockEquipment,
        vaultwarden_status: 'LOCKED',
        vaultwarden_collection_id: 'existing-col-uuid',
        vaultwarden_device_user_id: 'existing-user-uuid',
      });

      const res = await equipmentService.provisionDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id
      );

      expect(mockVaultwardenSvc.createDeviceCollection).toHaveBeenCalledWith(
        mockEquipment.tenant_id,
        'POS-Terminal-01',
        'existing-col-uuid'
      );
      expect(mockVaultwardenSvc.provisionDeviceAccount).toHaveBeenCalledWith(
        mockEquipment.tenant_id,
        'vw_col_123',
        expect.stringContaining('device_'),
        'existing-user-uuid'
      );
      expect(res.status).toBe('ACTIVE');
    });

    it('throws ForbiddenError if non-admin tries to provision another tenant device', async () => {
      await expect(
        equipmentService.provisionDeviceVault(mockEquipment.id, 'alien-tenant-id')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('revokeDeviceVault', () => {
    it('revokes session in Vaultwarden and sets status to LOCKED', async () => {
      mockEquipmentRepo.findById.mockResolvedValueOnce({
        ...mockEquipment,
        vaultwarden_status: 'ACTIVE',
        vaultwarden_device_user_id: 'vw_user_456',
        vaultwarden_collection_id: 'vw_col_123',
      });

      const res = await equipmentService.revokeDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id,
        'Suspected compromise'
      );

      expect(mockVaultwardenSvc.revokeDeviceSession).toHaveBeenCalledWith(
        mockEquipment.tenant_id,
        'vw_user_456'
      );
      expect(mockEquipmentRepo.update).toHaveBeenCalledWith(
        mockEquipment.id,
        expect.objectContaining({
          vaultwarden_status: 'LOCKED',
        })
      );
      expect(res.status).toBe('LOCKED');
      expect(res.message).toContain('revoked successfully');
    });
  });

  describe('Plan Entitlement Gating (BL-204)', () => {
    it('throws ForbiddenError when non-admin client attempts vault actions on a device with non-entitled plan', async () => {
      mockPlanRepo.findById.mockResolvedValue({
        id: 'PL-001',
        features: [
          { code: 'RMM_PATCH_MANAGEMENT', included: true },
          { code: 'HELPDESK_SUPPORT', included: true },
        ],
      });

      await expect(
        equipmentService.getDeviceVault(mockEquipment.id, mockEquipment.tenant_id, false)
      ).rejects.toThrow(ForbiddenError);

      await expect(
        equipmentService.provisionDeviceVault(mockEquipment.id, mockEquipment.tenant_id, false)
      ).rejects.toThrow(/does not include Password Manager entitlement/i);

      await expect(
        equipmentService.revokeDeviceVault(mockEquipment.id, mockEquipment.tenant_id, 'audit', false)
      ).rejects.toThrow(/does not include Password Manager entitlement/i);
    });

    it('allows admin to manage device vaults regardless of plan features', async () => {
      mockPlanRepo.findById.mockResolvedValueOnce({
        id: 'PL-001',
        features: [
          { code: 'RMM_PATCH_MANAGEMENT', included: true },
        ],
      });

      const res = await equipmentService.getDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id,
        true // byAdmin = true
      );

      expect(res.equipmentId).toBe(mockEquipment.id);
      expect(mockPlanRepo.findById).not.toHaveBeenCalled();
    });

    it('allows client access when plan includes bundled PASSWORD_DARK_WEB feature', async () => {
      mockPlanRepo.findById.mockResolvedValueOnce({
        id: 'PL-003',
        features: [
          { code: 'PASSWORD_DARK_WEB', included: true },
        ],
      });

      const res = await equipmentService.getDeviceVault(
        mockEquipment.id,
        mockEquipment.tenant_id,
        false
      );

      expect(res.equipmentId).toBe(mockEquipment.id);
    });
  });
});
