import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { TenantController } from './TenantController';

describe('TenantController', () => {
  let mockService: any;
  let controller: TenantController;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockService = {
      listTenants: vi.fn(),
      getTenantById: vi.fn(),
    };
    controller = new TenantController(mockService);
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('listTenants', () => {
    it('returns 200 with list of tenants', async () => {
      const tenants = [{ id: 't-1', name: 'Tenant 1' }];
      mockService.listTenants.mockResolvedValue(tenants);

      await controller.listTenants({} as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: tenants,
      });
    });
  });

  describe('getTenant', () => {
    it('returns 200 with tenant data', async () => {
      const tenant = { id: 't-1', name: 'Tenant 1' };
      mockService.getTenantById.mockResolvedValue(tenant);

      const req = { params: { id: 't-1' } } as unknown as Request;
      await controller.getTenant(req, mockRes as Response);

      expect(mockService.getTenantById).toHaveBeenCalledWith('t-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: tenant,
      });
    });
  });
});
