import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { ConsumableController } from './ConsumableController';

describe('ConsumableController', () => {
  let mockService: any;
  let controller: ConsumableController;
  let mockRes: Partial<Response>;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockConsumableId = '22222222-2222-2222-2222-222222222222';
  const mockUserId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockService = {
      listConsumables: vi.fn(),
      getConsumable: vi.fn(),
      createConsumable: vi.fn(),
      updateConsumable: vi.fn(),
      deleteConsumable: vi.fn(),
      checkout: vi.fn(),
      restock: vi.fn(),
      getCheckouts: vi.fn(),
    };
    controller = new ConsumableController(mockService);
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('listConsumables', () => {
    it('returns 200 with consumable list and kpi counts', async () => {
      const data = { consumables: [], total: 0, lowStockCount: 0, outOfStockCount: 0 };
      mockService.listConsumables.mockResolvedValue(data);

      const req = {
        user: { tenantId: mockTenantId },
        query: { search: 'Cable' },
      } as unknown as Request;

      await controller.listConsumables(req, mockRes as Response);

      expect(mockService.listConsumables).toHaveBeenCalledWith(mockTenantId, 'Cable');
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data });
    });
  });

  describe('checkout', () => {
    it('calls checkout with dispensedById and returns 200 JSON', async () => {
      const input = { quantity: 2, notes: 'Office 301' };
      const updated = { id: mockConsumableId, totalQuantity: 8 };
      mockService.checkout.mockResolvedValue(updated);

      const req = {
        user: { tenantId: mockTenantId, userId: mockUserId },
        params: { id: mockConsumableId },
        body: input,
      } as unknown as Request;

      await controller.checkout(req, mockRes as Response);

      expect(mockService.checkout).toHaveBeenCalledWith(
        mockTenantId,
        mockConsumableId,
        input,
        mockUserId
      );
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('restock', () => {
    it('calls restock and returns updated record', async () => {
      const input = { quantity: 10, orderNumber: 'PO-100' };
      const updated = { id: mockConsumableId, totalQuantity: 18 };
      mockService.restock.mockResolvedValue(updated);

      const req = {
        user: { tenantId: mockTenantId },
        params: { id: mockConsumableId },
        body: input,
      } as unknown as Request;

      await controller.restock(req, mockRes as Response);

      expect(mockService.restock).toHaveBeenCalledWith(
        mockTenantId,
        mockConsumableId,
        input
      );
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('getCheckouts', () => {
    it('returns checkout history', async () => {
      const checkouts = [{ id: 'chk-1', quantity: 2 }];
      mockService.getCheckouts.mockResolvedValue(checkouts);

      const req = {
        user: { tenantId: mockTenantId },
        params: { id: mockConsumableId },
      } as unknown as Request;

      await controller.getCheckouts(req, mockRes as Response);

      expect(mockService.getCheckouts).toHaveBeenCalledWith(mockTenantId, mockConsumableId);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: checkouts });
    });
  });
});
