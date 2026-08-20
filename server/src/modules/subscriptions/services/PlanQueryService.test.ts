import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findWithFilters: vi.fn(),
    findById: vi.fn(),
  };
});

vi.mock('@modules/subscriptions/repositories/PlanRepository', () => {
  return {
    planRepository: {
      findWithFilters: mocks.findWithFilters,
      findById: mocks.findById,
    },
  };
});

import { planQueryService } from './PlanQueryService';
import { PlanClientType, UserContext, UserRole } from '@shared/types';

const clientCtx: UserContext = { userId: 'u1', role: UserRole.CLIENT, tenantId: 't1' };
const adminCtx: UserContext = { userId: 'u2', role: UserRole.ADMIN, tenantId: 't1' };

describe('PlanQueryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPlans', () => {
    it('should filter to active plans for clients and return paginated result', async () => {
      mocks.findWithFilters.mockResolvedValue({ plans: [], total: 0 });

      const result = await planQueryService.listPlans({ page: 1, limit: 20 }, clientCtx);

      expect(mocks.findWithFilters).toHaveBeenCalledWith({ page: 1, limit: 20, includeInactive: false });
      expect(result).toEqual({ plans: [], total: 0 });
    });

    it('should include inactive plans for admins', async () => {
      mocks.findWithFilters.mockResolvedValue({ plans: [], total: 0 });

      await planQueryService.listPlans({}, adminCtx);

      expect(mocks.findWithFilters).toHaveBeenCalledWith({ includeInactive: true });
    });
  });

  describe('getPlanById', () => {
    it('should return the plan if found', async () => {
      const mockPlan = {
        id: 'PL-001',
        name: 'Basic',
        price: 18,
        client_type: PlanClientType.CLIENT,
        active: true,
      };
      mocks.findById.mockResolvedValue(mockPlan);

      const result = await planQueryService.getPlanById('PL-001', clientCtx);

      expect(mocks.findById).toHaveBeenCalledWith('PL-001');
      expect(result).toEqual(mockPlan);
    });

    it('should throw 404 AppError if not found', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(planQueryService.getPlanById('NONEXISTENT', clientCtx)).rejects.toMatchObject({
        message: 'Plan not found',
        statusCode: 404,
        code: 'NOT_FOUND_ERROR',
      });
    });

    it('should block clients from reading inactive plans', async () => {
      mocks.findById.mockResolvedValue({ id: 'PL-001', active: false });

      await expect(planQueryService.getPlanById('PL-001', clientCtx)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN_ERROR',
      });
    });

    it('should allow admins to read inactive plans', async () => {
      const mockPlan = { id: 'PL-001', active: false };
      mocks.findById.mockResolvedValue(mockPlan);

      const result = await planQueryService.getPlanById('PL-001', adminCtx);

      expect(result).toEqual(mockPlan);
    });
  });
});
