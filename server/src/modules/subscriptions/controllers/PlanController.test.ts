import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    listPlans: vi.fn(),
    getPlanById: vi.fn(),
    updatePlan: vi.fn(),
    createPlan: vi.fn(),
    softDeletePlan: vi.fn(),
  };
});

vi.mock('@modules/subscriptions/services/PlanQueryService', () => {
  return {
    planQueryService: {
      listPlans: mocks.listPlans,
      getPlanById: mocks.getPlanById,
    },
  };
});

vi.mock('@modules/subscriptions/services/PlanAdminService', () => {
  return {
    planAdminService: {
      updatePlan: mocks.updatePlan,
      createPlan: mocks.createPlan,
      softDeletePlan: mocks.softDeletePlan,
    },
  };
});

import { planController } from './PlanController';

const baseUser = { userId: 'u1', role: 'CLIENT', tenantId: 't1' };

describe('PlanController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return plans with success status and pagination', async () => {
      const mockPlans = [
        { id: 'PL-001', price: 18, name: 'Basic' },
        { id: 'PL-002', price: 42, name: 'Standard' },
      ];
      mocks.listPlans.mockResolvedValue({ plans: mockPlans, total: 2 });

      const req = { user: baseUser, query: {} } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;

      await planController.getAll(req, res);

      expect(mocks.listPlans).toHaveBeenCalledWith({}, { userId: 'u1', role: 'CLIENT', tenantId: 't1' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPlans,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      });
    });

    it('should forward query filters and pagination values', async () => {
      mocks.listPlans.mockResolvedValue({ plans: [], total: 0 });

      const req = {
        user: baseUser,
        query: { search: 'basic', page: '2', limit: '5' },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;

      await planController.getAll(req, res);

      expect(mocks.listPlans).toHaveBeenCalledWith(
        { search: 'basic', page: '2', limit: '5' },
        { userId: 'u1', role: 'CLIENT', tenantId: 't1' }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pagination: { page: '2', limit: '5', total: 0, totalPages: 0 } })
      );
    });
  });

  describe('getById', () => {
    it('should return a plan with success status', async () => {
      const mockPlan = { id: 'PL-001', price: 18, name: 'Basic' };
      mocks.getPlanById.mockResolvedValue(mockPlan);

      const req = {
        user: baseUser,
        params: { id: 'PL-001' },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;

      await planController.getById(req, res);

      expect(mocks.getPlanById).toHaveBeenCalledWith('PL-001', {
        userId: 'u1',
        role: 'CLIENT',
        tenantId: 't1',
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockPlan });
    });
  });

  describe('update', () => {
    it('should update a plan and return success status and updated data', async () => {
      const updatedPlan = { id: 'PL-001', price: 349, name: 'Basic Plus' };
      mocks.updatePlan.mockResolvedValue(updatedPlan);

      const req = {
        user: baseUser,
        params: { id: 'PL-001' },
        body: { name: 'Basic Plus', price: 349 },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;

      await planController.update(req, res);

      expect(mocks.updatePlan).toHaveBeenCalledWith(
        'PL-001',
        { name: 'Basic Plus', price: 349 },
        { userId: 'u1', role: 'CLIENT', tenantId: 't1' }
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedPlan });
    });
  });

  describe('create', () => {
    it('should create a plan and return 201 with created plan data', async () => {
      const newPlan = { id: 'PL-NEW', price: 15, name: 'New Plan' };
      mocks.createPlan.mockResolvedValue(newPlan);

      const req = {
        user: baseUser,
        body: { id: 'PL-NEW', price: 15, name: 'New Plan' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await planController.create(req, res);

      expect(mocks.createPlan).toHaveBeenCalledWith(
        { id: 'PL-NEW', price: 15, name: 'New Plan' },
        { userId: 'u1', role: 'CLIENT', tenantId: 't1' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: newPlan });
    });
  });

  describe('delete', () => {
    it('should soft delete a plan and return success status and updated plan data', async () => {
      const deletedPlan = { id: 'PL-001', price: 18, name: 'Basic', active: false };
      mocks.softDeletePlan.mockResolvedValue(deletedPlan);

      const req = {
        user: baseUser,
        params: { id: 'PL-001' },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;

      await planController.delete(req, res);

      expect(mocks.softDeletePlan).toHaveBeenCalledWith('PL-001', {
        userId: 'u1',
        role: 'CLIENT',
        tenantId: 't1',
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: deletedPlan });
    });
  });
});
