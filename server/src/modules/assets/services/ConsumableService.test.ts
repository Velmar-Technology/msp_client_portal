import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsumableService } from './ConsumableService';
import { ConsumableRepository } from '../repositories/ConsumableRepository';
import { NotificationRepository } from '@modules/notifications';
import { UserRepository } from '@modules/auth';
import { NotFoundError, ValidationError } from '@shared/errors';
import { Consumable } from '@shared/db';

describe('ConsumableService', () => {
  let service: ConsumableService;
  let mockRepo: Partial<Record<keyof ConsumableRepository, any>>;
  let mockNotifRepo: Partial<Record<keyof NotificationRepository, any>>;
  let mockUserRepo: Partial<Record<keyof UserRepository, any>>;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockConsumableId = '22222222-2222-2222-2222-222222222222';
  const mockTechId = '33333333-3333-3333-3333-333333333333';

  const mockDbConsumable: Consumable = {
    id: mockConsumableId,
    tenant_id: mockTenantId,
    name: 'HP 58A Black Toner',
    category: 'Printer Supplies',
    model_number: 'CF258A',
    item_number: 'SKU-58A',
    manufacturer: 'HP',
    total_quantity: 10,
    min_quantity: 4,
    location: 'Supply Closet B',
    purchase_cost: '89.99',
    alert_state: 'NORMAL',
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    deleted_at: null,
  };

  beforeEach(() => {
    mockRepo = {
      listByTenant: vi.fn(),
      findByIdAndTenant: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      createCheckout: vi.fn(),
      listCheckouts: vi.fn(),
    };
    mockNotifRepo = {
      create: vi.fn(),
    };
    mockUserRepo = {
      findByTenantId: vi.fn().mockResolvedValue([
        { id: mockTechId, role: 'TECHNICIAN' },
        { id: '44444444-4444-4444-4444-444444444444', role: 'ADMIN' },
        { id: '55555555-5555-5555-5555-555555555555', role: 'CLIENT' },
      ]),
    };

    service = new ConsumableService(
      mockRepo as unknown as ConsumableRepository,
      mockNotifRepo as unknown as NotificationRepository,
      mockUserRepo as unknown as UserRepository
    );
  });

  describe('listConsumables', () => {
    it('returns summary KPI counts for low and out of stock items', async () => {
      const items: Consumable[] = [
        { ...mockDbConsumable, total_quantity: 10 },
        { ...mockDbConsumable, id: 'c-2', total_quantity: 3, min_quantity: 5 },
        { ...mockDbConsumable, id: 'c-3', total_quantity: 0, min_quantity: 5 },
      ];

      mockRepo.listByTenant!.mockResolvedValue(items);

      const result = await service.listConsumables(mockTenantId);

      expect(result.total).toBe(3);
      expect(result.lowStockCount).toBe(1);
      expect(result.outOfStockCount).toBe(1);
      expect(result.consumables).toHaveLength(3);
    });
  });

  describe('checkout', () => {
    it('throws ValidationError if checkout quantity exceeds available stock', async () => {
      mockRepo.findByIdAndTenant!.mockResolvedValue({
        ...mockDbConsumable,
        total_quantity: 2,
      });

      await expect(
        service.checkout(mockTenantId, mockConsumableId, { quantity: 5 }, mockTechId)
      ).rejects.toThrow(ValidationError);
    });

    it('decrements stock, records ledger entry, and sends alert when crossing min threshold', async () => {
      mockRepo.findByIdAndTenant!
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 5,
          min_quantity: 4,
          alert_state: 'NORMAL',
        })
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 3,
          alert_state: 'LOW_STOCK_NOTIFIED',
        });

      mockRepo.createCheckout!.mockResolvedValue({});
      mockRepo.update!.mockResolvedValue({});

      const updated = await service.checkout(
        mockTenantId,
        mockConsumableId,
        { quantity: 2, notes: 'Deployment' },
        mockTechId
      );

      expect(mockRepo.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          consumable_id: mockConsumableId,
          quantity: 2,
          dispensed_by_id: mockTechId,
        })
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        mockConsumableId,
        mockTenantId,
        expect.objectContaining({
          total_quantity: 3,
          alert_state: 'LOW_STOCK_NOTIFIED',
        })
      );
      expect(mockNotifRepo.create).toHaveBeenCalledTimes(2); // ADMIN & TECHNICIAN notified
      expect(updated.totalQuantity).toBe(3);
    });

    it('triggers OUT_OF_STOCK_NOTIFIED alert when stock reaches 0', async () => {
      mockRepo.findByIdAndTenant!
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 2,
          alert_state: 'LOW_STOCK_NOTIFIED',
        })
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 0,
          alert_state: 'OUT_OF_STOCK_NOTIFIED',
        });

      await service.checkout(
        mockTenantId,
        mockConsumableId,
        { quantity: 2 },
        mockTechId
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        mockConsumableId,
        mockTenantId,
        expect.objectContaining({
          total_quantity: 0,
          alert_state: 'OUT_OF_STOCK_NOTIFIED',
        })
      );
      expect(mockNotifRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('restock', () => {
    it('increases quantity and clears alert suppression back to NORMAL', async () => {
      mockRepo.findByIdAndTenant!
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 2,
          min_quantity: 5,
          alert_state: 'LOW_STOCK_NOTIFIED',
        })
        .mockResolvedValueOnce({
          ...mockDbConsumable,
          total_quantity: 12,
          alert_state: 'NORMAL',
        });

      const updated = await service.restock(mockTenantId, mockConsumableId, {
        quantity: 10,
        orderNumber: 'PO-991',
        unitCost: 85.0,
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        mockConsumableId,
        mockTenantId,
        expect.objectContaining({
          total_quantity: 12,
          alert_state: 'NORMAL',
          purchase_cost: '85',
        })
      );
      expect(updated.totalQuantity).toBe(12);
    });
  });
});
