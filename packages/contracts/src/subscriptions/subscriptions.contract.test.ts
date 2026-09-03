import { describe, it, expect } from 'vitest';
import {
  CreateSubscriptionInputSchema,
  CreatePaypalOrderInputSchema,
  UpdateSubscriptionInputSchema,
  CreatePlanInputSchema,
  PlanQuerySchema,
  SubscriptionStatus,
  PlanClientType,
} from './subscriptions.contract';

describe('Subscriptions & Plans Contract Schemas', () => {
  describe('CreateSubscriptionInputSchema', () => {
    it('accepts valid subscription inputs', () => {
      const valid = {
        serviceName: 'Enterprise Cloud Support',
        plan: 'PREMIUM',
        equipmentCount: 5,
        billingCycle: 'monthly',
      };
      const result = CreateSubscriptionInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects 0 equipment count', () => {
      const invalid = {
        serviceName: 'Enterprise Cloud Support',
        plan: 'PREMIUM',
        equipmentCount: 0,
      };
      const result = CreateSubscriptionInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreatePaypalOrderInputSchema', () => {
    it('accepts valid paypal order creation inputs', () => {
      const valid = {
        plan: 'STANDARD',
        equipmentCount: 3,
        billingCycle: 'annual',
      };
      const result = CreatePaypalOrderInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('CreatePlanInputSchema', () => {
    it('accepts valid plan inputs with default client_type', () => {
      const valid = {
        id: 'PLAN-PRO',
        name: 'Pro Support Plan',
        price: 99,
        features: [
          { code: 'HELPDESK_SUPPORT', included: true },
          { code: 'EDR_SECURITY', included: false },
        ],
      };
      const result = CreatePlanInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.client_type).toBe(PlanClientType.CLIENT);
      }
    });

    it('rejects negative price', () => {
      const invalid = {
        id: 'PLAN-PRO',
        name: 'Pro Support Plan',
        price: -10,
      };
      expect(CreatePlanInputSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('PlanQuerySchema', () => {
    it('applies default pagination', () => {
      const result = PlanQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });
});
