import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    planFindById: vi.fn(),
    subscriptionFindById: vi.fn(),
    paypalCreateOrderForAmount: vi.fn(),
    pricingCalculateUpgrade: vi.fn(),
    pricingCalculate: vi.fn(),
  };
});

vi.mock('@modules/subscriptions/repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
    },
  };
});

vi.mock('@modules/subscriptions/repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findById: mocks.subscriptionFindById,
    },
  };
});

vi.mock('@modules/billing', () => {
  return {
    paypalService: {
      createOrderForAmount: mocks.paypalCreateOrderForAmount,
    },
    billingPricingService: {
      calculateUpgradePricing: mocks.pricingCalculateUpgrade,
      calculatePricing: mocks.pricingCalculate,
    },
  };
});

import { subscriptionPaymentService } from './SubscriptionPaymentService';
import { NotFoundError, ValidationError } from '@shared/errors';

describe('SubscriptionPaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.paypalCreateOrderForAmount.mockResolvedValue({ id: 'ORDER-123' });
    mocks.pricingCalculateUpgrade.mockReturnValue({ subtotal: 2598, tax: 0, total: 2598 });
    mocks.pricingCalculate.mockReturnValue({ subtotal: 1299, tax: 0, total: 1299 });
  });

  describe('createPaypalOrderForSubscription', () => {
    const mockPlan = { id: 'PREMIUM', name: 'Premium Support', price: 1299 };

    it('should price only the additional devices when upgrading an existing subscription', async () => {
      mocks.planFindById.mockResolvedValue(mockPlan);
      mocks.subscriptionFindById.mockResolvedValue({
        id: 'sub-1',
        equipment_count: 3,
      });

      const result = await subscriptionPaymentService.createPaypalOrderForSubscription({
        plan: 'PREMIUM',
        equipmentCount: 5,
        billingCycle: 'monthly',
        currentSubscriptionId: 'sub-1',
      });

      expect(mocks.subscriptionFindById).toHaveBeenCalledWith('sub-1');
      expect(mocks.pricingCalculateUpgrade).toHaveBeenCalledWith(1299, 2, 'monthly');
      expect(mocks.paypalCreateOrderForAmount).toHaveBeenCalledWith(
        2598,
        expect.stringContaining('Adding 2 Equipment'),
        expect.any(String)
      );
      expect(result).toEqual({ orderId: 'ORDER-123' });
    });

    it('should throw ValidationError when new equipment count does not exceed current count', async () => {
      mocks.planFindById.mockResolvedValue(mockPlan);
      mocks.subscriptionFindById.mockResolvedValue({
        id: 'sub-1',
        equipment_count: 5,
      });

      await expect(
        subscriptionPaymentService.createPaypalOrderForSubscription({
          plan: 'PREMIUM',
          equipmentCount: 5,
          billingCycle: 'monthly',
          currentSubscriptionId: 'sub-1',
        })
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mocks.paypalCreateOrderForAmount).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when the current subscription does not exist', async () => {
      mocks.planFindById.mockResolvedValue(mockPlan);
      mocks.subscriptionFindById.mockResolvedValue(null);

      await expect(
        subscriptionPaymentService.createPaypalOrderForSubscription({
          plan: 'PREMIUM',
          equipmentCount: 5,
          billingCycle: 'monthly',
          currentSubscriptionId: 'missing-sub',
        })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(mocks.paypalCreateOrderForAmount).not.toHaveBeenCalled();
    });

    it('should price the full equipment count for a brand new subscription', async () => {
      mocks.planFindById.mockResolvedValue(mockPlan);

      const result = await subscriptionPaymentService.createPaypalOrderForSubscription({
        plan: 'PREMIUM',
        equipmentCount: 4,
        billingCycle: 'annual',
      });

      expect(mocks.subscriptionFindById).not.toHaveBeenCalled();
      expect(mocks.pricingCalculate).toHaveBeenCalledWith(1299, 4, 'annual');
      expect(mocks.paypalCreateOrderForAmount).toHaveBeenCalledWith(
        1299,
        expect.any(String),
        expect.any(String)
      );
      expect(result).toEqual({ orderId: 'ORDER-123' });
    });
  });
});
