import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock('../repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.findById,
      findAll: mocks.findAll,
      update: mocks.update,
    },
  };
});

import { planService } from './PlanService';

describe('PlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllPlans', () => {
    it('should return sorted plans by price', async () => {
      const mockPlans = [
        { id: 'STANDARD', price: 599, name: 'Standard' },
        { id: 'BASIC', price: 299, name: 'Basic' },
        { id: 'PREMIUM', price: 1299, name: 'Premium' },
      ];
      mocks.findAll.mockResolvedValue(mockPlans);

      const result = await planService.getAllPlans();

      expect(mocks.findAll).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 'BASIC', price: 299, name: 'Basic' },
        { id: 'STANDARD', price: 599, name: 'Standard' },
        { id: 'PREMIUM', price: 1299, name: 'Premium' },
      ]);
    });
  });

  describe('getPlanById', () => {
    it('should return the plan if found', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic' };
      mocks.findById.mockResolvedValue(mockPlan);

      const result = await planService.getPlanById('BASIC');

      expect(mocks.findById).toHaveBeenCalledWith('BASIC');
      expect(result).toEqual(mockPlan);
    });

    it('should throw 404 AppError if not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planService.getPlanById('NONEXISTENT')).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('updatePlan', () => {
    it('should update and return the updated plan', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic' };
      const updatedPlan = { id: 'BASIC', price: 349, name: 'Basic Plus' };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(updatedPlan);

      const result = await planService.updatePlan('BASIC', { name: 'Basic Plus', price: 349 });

      expect(mocks.findById).toHaveBeenCalledWith('BASIC');
      expect(mocks.update).toHaveBeenCalledWith('BASIC', { name: 'Basic Plus', price: 349 });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw 404 AppError if plan to update is not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planService.updatePlan('NONEXISTENT', { price: 300 })).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('should throw 500 AppError if database update fails', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic' };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(null);

      await expect(planService.updatePlan('BASIC', { price: 300 })).rejects.toMatchObject({
        message: 'Failed to update plan',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
