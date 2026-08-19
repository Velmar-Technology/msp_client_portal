import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  };
});

vi.mock('@modules/subscriptions/repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.findById,
      update: mocks.update,
      create: mocks.create,
    },
  };
});

import { planAdminService } from './PlanAdminService';
import { PlanClientType, UserContext, UserRole } from '@shared/types';

const adminCtx: UserContext = { userId: 'u2', role: UserRole.ADMIN, tenantId: 't1' };
const clientCtx: UserContext = { userId: 'u3', role: UserRole.CLIENT, tenantId: 't1' };

describe('PlanAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RBAC guard', () => {
    it('should reject non-admin mutation attempts', async () => {
      await expect(
        planAdminService.createPlan({ id: 'PL-NEW', name: 'New', price: 15 }, clientCtx)
      ).rejects.toMatchObject({
        message: 'Only administrators can manage plans',
        statusCode: 403,
        code: 'FORBIDDEN',
      });
      expect(mocks.create).not.toHaveBeenCalled();
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
        client_type: PlanClientType.CLIENT as const,
        features: [{ text: 'Feature 1', included: true }],
        recommended: false,
        active: true,
      };
      const createdPlan = { ...planData, created_at: new Date(), updated_at: new Date() };
      mocks.create.mockResolvedValue(createdPlan);

      const result = await planAdminService.createPlan(planData, adminCtx);

      expect(mocks.findById).toHaveBeenCalledWith('PL-NEW');
      expect(mocks.create).toHaveBeenCalledWith({
        id: 'PL-NEW',
        name: 'New Plan',
        price: 15,
        description: 'New plan description',
        client_type: PlanClientType.CLIENT,
        features: [{ text: 'Feature 1', included: true }],
        recommended: false,
        active: true,
      });
      expect(result).toEqual(createdPlan);
    });

    it('should default client_type to CLIENT when omitted', async () => {
      mocks.findById.mockResolvedValue(null);
      mocks.create.mockResolvedValue({});

      await planAdminService.createPlan({ id: 'PL-NEW', name: 'New Plan', price: 15 }, adminCtx);

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ client_type: PlanClientType.CLIENT, active: true })
      );
    });

    it('should throw conflict AppError if plan ID already exists', async () => {
      mocks.findById.mockResolvedValue({ id: 'PL-NEW', price: 15, name: 'New Plan' });

      await expect(
        planAdminService.createPlan({ id: 'PL-NEW', name: 'New Plan', price: 15 }, adminCtx)
      ).rejects.toMatchObject({
        message: "Plan with ID 'PL-NEW' already exists",
        statusCode: 409,
        code: 'CONFLICT',
      });
      expect(mocks.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePlan', () => {
    it('should update and return the updated plan', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic' };
      const updatedPlan = { id: 'BASIC', price: 349, name: 'Basic Plus' };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(updatedPlan);

      const result = await planAdminService.updatePlan('BASIC', { name: 'Basic Plus', price: 349 }, adminCtx);

      expect(mocks.findById).toHaveBeenCalledWith('BASIC');
      expect(mocks.update).toHaveBeenCalledWith('BASIC', { name: 'Basic Plus', price: 349 });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw 404 AppError if plan to update is not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planAdminService.updatePlan('NONEXISTENT', { price: 300 }, adminCtx)).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('should throw 500 AppError if database update fails', async () => {
      mocks.findById.mockResolvedValue({ id: 'BASIC' });
      mocks.update.mockResolvedValue(null);

      await expect(planAdminService.updatePlan('BASIC', { price: 300 }, adminCtx)).rejects.toMatchObject({
        message: 'Failed to update plan',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('softDeletePlan', () => {
    it('should set active to false and return updated plan', async () => {
      const mockPlan = { id: 'BASIC', price: 299, name: 'Basic', active: true };
      const updatedPlan = { ...mockPlan, active: false };
      mocks.findById.mockResolvedValue(mockPlan);
      mocks.update.mockResolvedValue(updatedPlan);

      const result = await planAdminService.softDeletePlan('BASIC', adminCtx);

      expect(mocks.findById).toHaveBeenCalledWith('BASIC');
      expect(mocks.update).toHaveBeenCalledWith('BASIC', { active: false });
      expect(result).toEqual(updatedPlan);
    });

    it('should throw 404 AppError if plan is not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planAdminService.softDeletePlan('NONEXISTENT', adminCtx)).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('should throw 500 AppError if database update fails', async () => {
      mocks.findById.mockResolvedValue({ id: 'BASIC', active: true });
      mocks.update.mockResolvedValue(null);

      await expect(planAdminService.softDeletePlan('BASIC', adminCtx)).rejects.toMatchObject({
        message: 'Failed to soft delete plan',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
