import { describe, it, expect } from 'vitest';
import { planAccessPolicy } from './PlanAccessPolicy';
import { Plan, PlanClientType, UserContext, UserRole } from '@shared/types';

const adminCtx: UserContext = { userId: 'u1', role: UserRole.ADMIN, tenantId: 't1' };
const techCtx: UserContext = { userId: 'u2', role: UserRole.TECHNICIAN, tenantId: 't1' };
const clientCtx: UserContext = { userId: 'u3', role: UserRole.CLIENT, tenantId: 't1' };

const plan = (active: boolean): Plan => ({
  id: 'PL-001',
  name: 'Basic',
  description: null,
  price: 18,
  features: [],
  recommended: false,
  client_type: PlanClientType.CLIENT,
  active,
  created_at: new Date(),
  updated_at: new Date(),
});

describe('PlanAccessPolicy', () => {
  describe('assertAdminMutation', () => {
    it('should allow admins', () => {
      expect(() => planAccessPolicy.assertAdminMutation(adminCtx)).not.toThrow();
    });

    it('should reject technicians', () => {
      expect(() => planAccessPolicy.assertAdminMutation(techCtx)).toThrow();
    });

    it('should reject clients', () => {
      expect(() => planAccessPolicy.assertAdminMutation(clientCtx)).toThrow();
    });
  });

  describe('canViewInactive', () => {
    it('should be true for admins and technicians', () => {
      expect(planAccessPolicy.canViewInactive(adminCtx)).toBe(true);
      expect(planAccessPolicy.canViewInactive(techCtx)).toBe(true);
    });

    it('should be false for clients', () => {
      expect(planAccessPolicy.canViewInactive(clientCtx)).toBe(false);
    });
  });

  describe('assertActivePlan', () => {
    it('should allow clients to read active plans', () => {
      expect(() => planAccessPolicy.assertActivePlan(plan(true), clientCtx)).not.toThrow();
    });

    it('should block clients from reading inactive plans', () => {
      expect(() => planAccessPolicy.assertActivePlan(plan(false), clientCtx)).toThrow();
    });

    it('should allow admins and technicians to read inactive plans', () => {
      expect(() => planAccessPolicy.assertActivePlan(plan(false), adminCtx)).not.toThrow();
      expect(() => planAccessPolicy.assertActivePlan(plan(false), techCtx)).not.toThrow();
    });
  });
});
