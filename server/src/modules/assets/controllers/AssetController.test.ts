import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { AssetController } from './AssetController';

describe('AssetController', () => {
  let mockService: any;
  let controller: AssetController;
  let mockRes: Partial<Response>;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockAssetId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    mockService = {
      listAssets: vi.fn(),
      getAsset: vi.fn(),
      createAsset: vi.fn(),
      updateAsset: vi.fn(),
      deleteAsset: vi.fn(),
    };
    controller = new AssetController(mockService);
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('listAssets', () => {
    it('calls service.listAssets with tenantId and filters and returns 200 JSON', async () => {
      const mockResult = {
        assets: [{ id: mockAssetId, name: 'Server' }],
        total: 1,
        activeCount: 1,
        maintenanceCount: 0,
      };
      mockService.listAssets.mockResolvedValue(mockResult);

      const req = {
        user: { tenantId: mockTenantId },
        query: { search: 'Server', status: 'ACTIVE' },
      } as unknown as Request;

      await controller.listAssets(req, mockRes as Response);

      expect(mockService.listAssets).toHaveBeenCalledWith(mockTenantId, {
        search: 'Server',
        type: undefined,
        status: 'ACTIVE',
        assignedClientId: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('getAsset', () => {
    it('retrieves single asset by ID and returns 200 JSON', async () => {
      const mockAsset = { id: mockAssetId, name: 'Cisco Router' };
      mockService.getAsset.mockResolvedValue(mockAsset);

      const req = {
        user: { tenantId: mockTenantId },
        params: { id: mockAssetId },
      } as unknown as Request;

      await controller.getAsset(req, mockRes as Response);

      expect(mockService.getAsset).toHaveBeenCalledWith(mockTenantId, mockAssetId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAsset,
      });
    });
  });

  describe('createAsset', () => {
    it('creates asset and returns 201 with created record', async () => {
      const input = { name: 'Firewall Fortinet 60F', assetType: 'NETWORK' };
      const createdAsset = { id: mockAssetId, ...input };
      mockService.createAsset.mockResolvedValue(createdAsset);

      const req = {
        user: { tenantId: mockTenantId },
        body: input,
      } as unknown as Request;

      await controller.createAsset(req, mockRes as Response);

      expect(mockService.createAsset).toHaveBeenCalledWith(mockTenantId, input);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdAsset,
      });
    });
  });

  describe('updateAsset', () => {
    it('updates asset and returns updated record', async () => {
      const updateData = { status: 'MAINTENANCE' };
      const updatedAsset = { id: mockAssetId, status: 'MAINTENANCE' };
      mockService.updateAsset.mockResolvedValue(updatedAsset);

      const req = {
        user: { tenantId: mockTenantId },
        params: { id: mockAssetId },
        body: updateData,
      } as unknown as Request;

      await controller.updateAsset(req, mockRes as Response);

      expect(mockService.updateAsset).toHaveBeenCalledWith(mockTenantId, mockAssetId, updateData);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedAsset,
      });
    });
  });

  describe('deleteAsset', () => {
    it('soft deletes asset and returns success confirmation', async () => {
      mockService.deleteAsset.mockResolvedValue({ success: true });

      const req = {
        user: { tenantId: mockTenantId },
        params: { id: mockAssetId },
      } as unknown as Request;

      await controller.deleteAsset(req, mockRes as Response);

      expect(mockService.deleteAsset).toHaveBeenCalledWith(mockTenantId, mockAssetId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { success: true },
      });
    });
  });
});
