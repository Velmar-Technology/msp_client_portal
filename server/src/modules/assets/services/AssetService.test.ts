import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetService } from './AssetService';
import { AssetRepository, AssetWithRelations } from '../repositories/AssetRepository';
import { NotFoundError, ValidationError } from '@shared/errors';

describe('AssetService', () => {
  let assetService: AssetService;
  let mockRepo: Partial<Record<keyof AssetRepository, any>>;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockAssetId = '22222222-2222-2222-2222-222222222222';

  const mockDbAsset: AssetWithRelations = {
    id: mockAssetId,
    tenant_id: mockTenantId,
    name: 'Core Switch Cisco 3850',
    asset_type: 'NETWORK',
    status: 'ACTIVE',
    model: 'WS-C3850-24P',
    serial_number: 'FCW2140A01X',
    manufacturer: 'Cisco Systems',
    assigned_client_id: '33333333-3333-3333-3333-333333333333',
    assigned_equipment_id: null,
    purchase_date: new Date('2025-06-01T00:00:00Z'),
    warranty_expires_at: new Date('2028-06-01T00:00:00Z'),
    notes: 'Main distribution switch rack 1',
    created_at: new Date('2025-06-01T10:00:00Z'),
    updated_at: new Date('2025-06-01T10:00:00Z'),
    deleted_at: null,
    assigned_client_name: 'Acme Corp Admin',
    assigned_equipment_name: null,
  };

  beforeEach(() => {
    mockRepo = {
      listByTenant: vi.fn(),
      findByIdAndTenant: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    assetService = new AssetService(mockRepo as unknown as AssetRepository);
  });

  describe('listAssets', () => {
    it('throws ValidationError when tenantId is empty', async () => {
      await expect(assetService.listAssets('')).rejects.toThrow(ValidationError);
    });

    it('returns formatted list with accurate summary counts', async () => {
      const maintenanceAsset: AssetWithRelations = {
        ...mockDbAsset,
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Backup Server',
        status: 'MAINTENANCE',
      };

      mockRepo.listByTenant!.mockResolvedValue([mockDbAsset, maintenanceAsset]);

      const result = await assetService.listAssets(mockTenantId);

      expect(result.total).toBe(2);
      expect(result.activeCount).toBe(1);
      expect(result.maintenanceCount).toBe(1);
      expect(result.assets[0].name).toBe('Core Switch Cisco 3850');
      expect(result.assets[0].assignedClientName).toBe('Acme Corp Admin');
      expect(mockRepo.listByTenant).toHaveBeenCalledWith(mockTenantId, undefined);
    });
  });

  describe('getAsset', () => {
    it('returns formatted asset contract when found', async () => {
      mockRepo.findByIdAndTenant!.mockResolvedValue(mockDbAsset);

      const result = await assetService.getAsset(mockTenantId, mockAssetId);

      expect(result.id).toBe(mockAssetId);
      expect(result.model).toBe('WS-C3850-24P');
      expect(result.assetType).toBe('NETWORK');
    });

    it('throws NotFoundError when asset does not exist', async () => {
      mockRepo.findByIdAndTenant!.mockResolvedValue(null);

      await expect(assetService.getAsset(mockTenantId, 'unknown-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createAsset', () => {
    it('creates and returns newly populated asset', async () => {
      mockRepo.create!.mockResolvedValue({ id: mockAssetId });
      mockRepo.findByIdAndTenant!.mockResolvedValue(mockDbAsset);

      const input = {
        name: 'Core Switch Cisco 3850',
        assetType: 'NETWORK' as const,
        status: 'ACTIVE' as const,
        model: 'WS-C3850-24P',
        serialNumber: 'FCW2140A01X',
        manufacturer: 'Cisco Systems',
      };

      const result = await assetService.createAsset(mockTenantId, input);

      expect(result.id).toBe(mockAssetId);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          name: 'Core Switch Cisco 3850',
          asset_type: 'NETWORK',
        })
      );
    });
  });

  describe('updateAsset', () => {
    it('updates partial fields and returns refreshed record', async () => {
      mockRepo.findByIdAndTenant!.mockResolvedValue(mockDbAsset);
      mockRepo.update!.mockResolvedValue({ ...mockDbAsset, status: 'MAINTENANCE' });

      const updated = await assetService.updateAsset(mockTenantId, mockAssetId, {
        status: 'MAINTENANCE',
        notes: 'Fan module failure',
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        mockAssetId,
        mockTenantId,
        expect.objectContaining({
          status: 'MAINTENANCE',
          notes: 'Fan module failure',
        })
      );
      expect(updated.id).toBe(mockAssetId);
    });

    it('throws NotFoundError if target asset does not exist', async () => {
      mockRepo.findByIdAndTenant!.mockResolvedValue(null);

      await expect(
        assetService.updateAsset(mockTenantId, 'non-existent', { name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteAsset', () => {
    it('soft deletes the record and returns success', async () => {
      mockRepo.softDelete!.mockResolvedValue(true);

      const result = await assetService.deleteAsset(mockTenantId, mockAssetId);

      expect(result).toEqual({ success: true });
      expect(mockRepo.softDelete).toHaveBeenCalledWith(mockAssetId, mockTenantId);
    });

    it('throws NotFoundError when repository soft delete fails', async () => {
      mockRepo.softDelete!.mockResolvedValue(false);

      await expect(assetService.deleteAsset(mockTenantId, 'non-existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
