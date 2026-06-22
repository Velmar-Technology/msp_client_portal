import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    getAllPlans: vi.fn(),
    getPlanById: vi.fn(),
    updatePlan: vi.fn(),
  };
});

vi.mock('../services/PlanService', () => {
  return {
    planService: {
      getAllPlans: mocks.getAllPlans,
      getPlanById: mocks.getPlanById,
      updatePlan: mocks.updatePlan,
    },
  };
});

import { planController } from './PlanController';

describe('PlanController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all plans with success status', async () => {
      const mockPlans = [
        { id: 'BASIC', price: 299, name: 'Basic' },
        { id: 'STANDARD', price: 599, name: 'Standard' },
      ];
      mocks.getAllPlans.mockResolvedValue(mockPlans);

      const req = {} as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await planController.getAll(req, res);

      expect(mocks.getAllPlans).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
      });
    });
  });

  describe('getById', () => {
    it('should return a plan with success status', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic' };
      mocks.getPlanById.mockResolvedValue(mockPlan);

      const req = {
        params: { id: 'BASIC' },
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await planController.getById(req, res);

      expect(mocks.getPlanById).toHaveBeenCalledWith('BASIC');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlan,
      });
    });
  });

  describe('update', () => {
    it('should update a plan and return success status and updated data', async () => {
      const updatedPlan = { id: 'BASIC', price: 349, name: 'Basic Plus' };
      mocks.updatePlan.mockResolvedValue(updatedPlan);

      const req = {
        params: { id: 'BASIC' },
        body: { name: 'Basic Plus', price: 349 },
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await planController.update(req, res);

      expect(mocks.updatePlan).toHaveBeenCalledWith('BASIC', { name: 'Basic Plus', price: 349 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedPlan,
      });
    });
  });
});
