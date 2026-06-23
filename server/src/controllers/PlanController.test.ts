import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    getAllPlans: vi.fn(),
    getPlanById: vi.fn(),
    updatePlan: vi.fn(),
    createPlan: vi.fn(),
  };
});

vi.mock('../services/PlanService', () => {
  return {
    planService: {
      getAllPlans: mocks.getAllPlans,
      getPlanById: mocks.getPlanById,
      updatePlan: mocks.updatePlan,
      createPlan: mocks.createPlan,
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

      expect(mocks.getAllPlans).toHaveBeenCalledWith(false);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
      });
    });

    it('should include inactive plans for admin', async () => {
      const mockPlans = [
        { id: 'BASIC', price: 299, name: 'Basic' },
        { id: 'STANDARD', price: 599, name: 'Standard' },
      ];
      mocks.getAllPlans.mockResolvedValue(mockPlans);

      const req = {
        user: { role: 'ADMIN' }
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await planController.getAll(req, res);

      expect(mocks.getAllPlans).toHaveBeenCalledWith(true);
    });

    it('should include inactive plans for technician', async () => {
      const mockPlans = [
        { id: 'BASIC', price: 299, name: 'Basic' },
        { id: 'STANDARD', price: 599, name: 'Standard' },
      ];
      mocks.getAllPlans.mockResolvedValue(mockPlans);

      const req = {
        user: { role: 'TECHNICIAN' }
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await planController.getAll(req, res);

      expect(mocks.getAllPlans).toHaveBeenCalledWith(true);
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

  describe('create', () => {
    it('should create a plan and return 201 with created plan data', async () => {
      const newPlan = { id: 'PL-NEW', price: 15, name: 'New Plan' };
      mocks.createPlan.mockResolvedValue(newPlan);

      const req = {
        body: { id: 'PL-NEW', price: 15, name: 'New Plan' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await planController.create(req, res);

      expect(mocks.createPlan).toHaveBeenCalledWith({ id: 'PL-NEW', price: 15, name: 'New Plan' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: newPlan,
      });
    });
  });
});
