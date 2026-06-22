import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    subFindById: vi.fn(),
    subFindByTenant: vi.fn(),
    subCreate: vi.fn(),
    subUpdatePlan: vi.fn(),
    subUpdateStatus: vi.fn(),
    userFindById: vi.fn(),
    planFindById: vi.fn(),
    invoiceFindByNumber: vi.fn(),
    invoiceCreate: vi.fn(),
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findById: mocks.subFindById,
      findByTenant: mocks.subFindByTenant,
      create: mocks.subCreate,
      updatePlan: mocks.subUpdatePlan,
      updateStatus: mocks.subUpdateStatus,
    },
  };
});

vi.mock('../repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.userFindById,
    },
  };
});

vi.mock('../repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
    },
  };
});

vi.mock('../repositories/InvoiceRepository', () => {
  return {
    invoiceRepository: {
      findByInvoiceNumber: mocks.invoiceFindByNumber,
      create: mocks.invoiceCreate,
    },
  };
});

import { subscriptionService } from './SubscriptionService';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientSubscriptions', () => {
    it('should return subscription list for a tenant', async () => {
      const mockSubs = [{ id: 'sub-1', tenant_id: 'tenant-123' }];
      mocks.subFindByTenant.mockResolvedValue(mockSubs);

      const result = await subscriptionService.getClientSubscriptions('tenant-123');
      expect(mocks.subFindByTenant).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockSubs);
    });
  });

  describe('getSubscriptionById', () => {
    it('should return subscription if found and tenant matches', async () => {
      const mockSub = { id: 'sub-1', tenant_id: 'tenant-123' };
      mocks.subFindById.mockResolvedValue(mockSub);

      const result = await subscriptionService.getSubscriptionById('sub-1', 'tenant-123');
      expect(mocks.subFindById).toHaveBeenCalledWith('sub-1');
      expect(result).toEqual(mockSub);
    });

    it('should throw 404 AppError if subscription not found', async () => {
      mocks.subFindById.mockResolvedValue(null);

      await expect(
        subscriptionService.getSubscriptionById('sub-1', 'tenant-123')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Subscription not found',
      });
    });

    it('should throw 403 AppError if tenant ID mismatches', async () => {
      const mockSub = { id: 'sub-1', tenant_id: 'tenant-456' };
      mocks.subFindById.mockResolvedValue(mockSub);

      await expect(
        subscriptionService.getSubscriptionById('sub-1', 'tenant-123')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Access denied',
      });
    });
  });

  describe('createSubscription', () => {
    const input = {
      serviceName: 'Velmar Premium Plan',
      plan: SubscriptionPlan.PREMIUM,
      equipmentCount: 5,
    };

    it('should successfully create subscription when client is valid and matches tenant', async () => {
      const mockUser = {
        id: 'client-123',
        tenant_id: 'tenant-123',
        role: 'CLIENT',
      };
      const mockCreatedSub = {
        id: 'sub-99',
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Monthly)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      };

      mocks.userFindById.mockResolvedValue(mockUser);
      mocks.subCreate.mockResolvedValue(mockCreatedSub);

      const result = await subscriptionService.createSubscription(input, 'client-123', 'tenant-123');

      expect(mocks.userFindById).toHaveBeenCalledWith('client-123');
      expect(mocks.subCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Monthly)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      }));
      const renewalArg = mocks.subCreate.mock.calls[0][0].renewal_date;
      const expectedDate = new Date();
      expectedDate.setMonth(expectedDate.getMonth() + 1);
      expect(Math.abs(renewalArg.getTime() - expectedDate.getTime())).toBeLessThan(1000);
      expect(result).toEqual(mockCreatedSub);
    });

    it('should successfully create annual subscription with 1-year renewal date and formatted service name', async () => {
      const mockUser = {
        id: 'client-123',
        tenant_id: 'tenant-123',
        role: 'CLIENT',
      };
      const mockCreatedSub = {
        id: 'sub-99',
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Annual)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      };

      mocks.userFindById.mockResolvedValue(mockUser);
      mocks.subCreate.mockResolvedValue(mockCreatedSub);

      const result = await subscriptionService.createSubscription(
        { ...input, billingCycle: 'annual' },
        'client-123',
        'tenant-123'
      );

      expect(mocks.userFindById).toHaveBeenCalledWith('client-123');
      expect(mocks.subCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Annual)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      }));
      const renewalArg = mocks.subCreate.mock.calls[0][0].renewal_date;
      const expectedDate = new Date();
      expectedDate.setFullYear(expectedDate.getFullYear() + 1);
      expect(Math.abs(renewalArg.getTime() - expectedDate.getTime())).toBeLessThan(1000);
      expect(result).toEqual(mockCreatedSub);
    });

    it('should calculate pricing and create invoice when byAdmin is true', async () => {
      const mockUser = {
        id: 'client-123',
        tenant_id: 'tenant-123',
        role: 'CLIENT',
      };
      const mockCreatedSub = {
        id: 'sub-99',
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Monthly)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      };
      const mockPlan = {
        id: 'PREMIUM',
        name: 'Premium Support',
        price: 1299,
      };

      mocks.userFindById.mockResolvedValue(mockUser);
      mocks.subCreate.mockResolvedValue(mockCreatedSub);
      mocks.planFindById.mockResolvedValue(mockPlan);
      mocks.invoiceFindByNumber.mockResolvedValue(null);
      mocks.invoiceCreate.mockResolvedValue({ id: 'invoice-123' });

      const result = await subscriptionService.createSubscription(input, 'client-123', 'tenant-123', true);

      expect(mocks.userFindById).toHaveBeenCalledWith('client-123');
      expect(mocks.planFindById).toHaveBeenCalledWith(input.plan);
      expect(mocks.invoiceFindByNumber).toHaveBeenCalled();
      expect(mocks.invoiceCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'client-123',
        amount: 1299 * 5,
        tax_amount: Math.round(1299 * 5 * 0.16 * 100) / 100,
        total: Math.round(1299 * 5 * 1.16 * 100) / 100,
        tenant_id: 'tenant-123',
      }));
      expect(result).toEqual(mockCreatedSub);
    });

    it('should calculate discounted pricing and create invoice when byAdmin is true and billingCycle is annual', async () => {
      const mockUser = {
        id: 'client-123',
        tenant_id: 'tenant-123',
        role: 'CLIENT',
      };
      const mockCreatedSub = {
        id: 'sub-99',
        client_id: 'client-123',
        service_name: 'Velmar Premium Plan (Annual)',
        plan: input.plan,
        equipment_count: input.equipmentCount,
        tenant_id: 'tenant-123',
      };
      const mockPlan = {
        id: 'PREMIUM',
        name: 'Premium Support',
        price: 1299,
      };

      mocks.userFindById.mockResolvedValue(mockUser);
      mocks.subCreate.mockResolvedValue(mockCreatedSub);
      mocks.planFindById.mockResolvedValue(mockPlan);
      mocks.invoiceFindByNumber.mockResolvedValue(null);
      mocks.invoiceCreate.mockResolvedValue({ id: 'invoice-123' });

      const result = await subscriptionService.createSubscription(
        { ...input, billingCycle: 'annual' },
        'client-123',
        'tenant-123',
        true
      );

      expect(mocks.userFindById).toHaveBeenCalledWith('client-123');
      expect(mocks.planFindById).toHaveBeenCalledWith(input.plan);
      expect(mocks.invoiceFindByNumber).toHaveBeenCalled();

      const expectedSubtotal = Math.round(1299 * 12 * 0.8 * 5 * 100) / 100;
      const expectedTax = Math.round(expectedSubtotal * 0.16 * 100) / 100;
      const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;

      expect(mocks.invoiceCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_id: 'client-123',
        amount: expectedSubtotal,
        tax_amount: expectedTax,
        total: expectedTotal,
        tenant_id: 'tenant-123',
      }));
      expect(result).toEqual(mockCreatedSub);
    });

    it('should throw 404 AppError if client user is not found', async () => {
      mocks.userFindById.mockResolvedValue(null);

      await expect(
        subscriptionService.createSubscription(input, 'nonexistent', 'tenant-123')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Client user not found',
      });
      expect(mocks.subCreate).not.toHaveBeenCalled();
    });

    it('should throw 403 AppError if client belongs to a different tenant', async () => {
      const mockUser = {
        id: 'client-123',
        tenant_id: 'tenant-456',
        role: 'CLIENT',
      };
      mocks.userFindById.mockResolvedValue(mockUser);

      await expect(
        subscriptionService.createSubscription(input, 'client-123', 'tenant-123')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Client does not belong to this tenant',
      });
      expect(mocks.subCreate).not.toHaveBeenCalled();
    });

    it('should throw 400 AppError if target user role is not CLIENT', async () => {
      const mockUser = {
        id: 'tech-123',
        tenant_id: 'tenant-123',
        role: 'TECHNICIAN',
      };
      mocks.userFindById.mockResolvedValue(mockUser);

      await expect(
        subscriptionService.createSubscription(input, 'tech-123', 'tenant-123')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Target user must have CLIENT role',
      });
      expect(mocks.subCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('should successfully update plan tier and status', async () => {
      const mockSub = {
        id: 'sub-1',
        tenant_id: 'tenant-123',
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockUpdatedPlanSub = {
        ...mockSub,
        plan: SubscriptionPlan.STANDARD,
      };

      const mockUpdatedStatusSub = {
        ...mockUpdatedPlanSub,
        status: SubscriptionStatus.CANCELLED,
      };

      mocks.subFindById.mockResolvedValue(mockSub);
      mocks.subUpdatePlan.mockResolvedValue(mockUpdatedPlanSub);
      mocks.subUpdateStatus.mockResolvedValue(mockUpdatedStatusSub);

      const result = await subscriptionService.updateSubscription(
        'sub-1',
        {
          plan: SubscriptionPlan.STANDARD,
          equipmentCount: 2,
          status: SubscriptionStatus.CANCELLED,
        },
        'tenant-123'
      );

      expect(mocks.subFindById).toHaveBeenCalledWith('sub-1');
      expect(mocks.subUpdatePlan).toHaveBeenCalledWith('sub-1', SubscriptionPlan.STANDARD, 2);
      expect(mocks.subUpdateStatus).toHaveBeenCalledWith('sub-1', SubscriptionStatus.CANCELLED);
      expect(result).toEqual(mockUpdatedStatusSub);
    });
  });
});
