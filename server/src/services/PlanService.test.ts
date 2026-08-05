import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  };
});

vi.mock('../repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.findById,
      findAll: mocks.findAll,
      update: mocks.update,
      create: mocks.create,
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

    it('should filter out inactive plans by default', async () => {
      const mockPlans = [
        { id: 'STANDARD', price: 599, name: 'Standard', active: true },
        { id: 'INACTIVE', price: 100, name: 'Inactive Plan', active: false },
        { id: 'BASIC', price: 299, name: 'Basic', active: true },
      ];
      mocks.findAll.mockResolvedValue(mockPlans);

      const result = await planService.getAllPlans();

      expect(result).toEqual([
        { id: 'BASIC', price: 299, name: 'Basic', active: true },
        { id: 'STANDARD', price: 599, name: 'Standard', active: true },
      ]);
    });

    it('should include inactive plans if includeInactive is true', async () => {
      const mockPlans = [
        { id: 'STANDARD', price: 599, name: 'Standard', active: true },
        { id: 'INACTIVE', price: 100, name: 'Inactive Plan', active: false },
        { id: 'BASIC', price: 299, name: 'Basic', active: true },
      ];
      mocks.findAll.mockResolvedValue(mockPlans);

      const result = await planService.getAllPlans(true);

      expect(result).toEqual([
        { id: 'INACTIVE', price: 100, name: 'Inactive Plan', active: false },
        { id: 'BASIC', price: 299, name: 'Basic', active: true },
        { id: 'STANDARD', price: 599, name: 'Standard', active: true },
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

  describe('createPlan', () => {
    it('should create a plan if it does not exist', async () => {
      mocks.findById.mockResolvedValue(null);
      const planData = {
        id: 'PL-NEW',
        name: 'New Plan',
        price: 15,
        description: 'New plan description',
        client_type: 'CLIENT' as const,
        features: [{ text: 'Feature 1', included: true }],
        recommended: false,
        active: true,
      };
      const createdPlan = { ...planData, created_at: new Date(), updated_at: new Date() };
      mocks.create.mockResolvedValue(createdPlan);

      const result = await planService.createPlan(planData);

      expect(mocks.findById).toHaveBeenCalledWith('PL-NEW');
      expect(mocks.create).toHaveBeenCalledWith({
        id: 'PL-NEW',
        name: 'New Plan',
        price: 15,
        description: 'New plan description',
        client_type: 'CLIENT',
        features: [{ text: 'Feature 1', included: true }],
        recommended: false,
        active: true,
      });
      expect(result).toEqual(createdPlan);
    });

    it('should throw conflict AppError if plan ID already exists', async () => {
      const mockPlan = { id: 'PL-NEW', price: 15, name: 'New Plan' };
      mocks.findById.mockResolvedValue(mockPlan);

      await expect(
        planService.createPlan({
          id: 'PL-NEW',
          name: 'New Plan',
          price: 15,
        })
      ).rejects.toMatchObject({
        message: "Plan with ID 'PL-NEW' already exists",
        statusCode: 409,
        code: 'CONFLICT',
      });
      expect(mocks.create).not.toHaveBeenCalled();
    });
  });

  describe('softDeletePlan', () => {
    it('should set active to false and return updated plan', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic', active: true };
      const updatedPlan = { ...mockPlan, active: false };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(updatedPlan);

      const result = await planService.softDeletePlan('BASIC');

      expect(mocks.findById).toHaveBeenCalledWith('BASIC');
      expect(mocks.update).toHaveBeenCalledWith('BASIC', { active: false });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw 404 AppError if plan is not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planService.softDeletePlan('NONEXISTENT')).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('should throw 500 AppError if database update fails', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic', active: true };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(null);

      await expect(planService.softDeletePlan('BASIC')).rejects.toMatchObject({
        message: 'Failed to soft delete plan',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
