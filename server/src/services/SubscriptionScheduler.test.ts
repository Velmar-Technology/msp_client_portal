import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    subFindPendingRenewal: vi.fn(),
    subUpdateRenewal: vi.fn(),
    subUpdateStatus: vi.fn(),
    planFindById: vi.fn(),
    invoiceFindByNumber: vi.fn(),
    invoiceCreate: vi.fn(),
    paypalGetSubscription: vi.fn(),
    createInAppNotification: vi.fn(),
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findPendingRenewal: mocks.subFindPendingRenewal,
      updateRenewal: mocks.subUpdateRenewal,
      updateStatus: mocks.subUpdateStatus,
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

vi.mock('./PaypalService', () => {
  return {
    paypalService: {
      getSubscription: mocks.paypalGetSubscription,
    },
  };
});

vi.mock('./NotificationService', () => {
  return {
    notificationService: {
      createInAppNotification: mocks.createInAppNotification,
    },
  };
});

import { subscriptionScheduler } from './SubscriptionScheduler';
import { SubscriptionStatus, InvoiceStatus } from '../types';

describe('SubscriptionScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do nothing if no subscriptions are pending renewal', async () => {
    mocks.subFindPendingRenewal.mockResolvedValue([]);
    await subscriptionScheduler.checkAndRenewSubscriptions();
    expect(mocks.subFindPendingRenewal).toHaveBeenCalled();
    expect(mocks.planFindById).not.toHaveBeenCalled();
  });

  it('should successfully renew a mock subscription', async () => {
    const mockSub = {
      id: 'sub-123',
      client_id: 'client-999',
      service_name: 'Premium Support (Monthly)',
      plan: 'PL-004',
      status: 'ACTIVE',
      renewal_date: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      equipment_count: 3,
      paypal_order_id: 'MOCK-SUB-XYZ',
      tenant_id: 'tenant-abc',
    };

    const mockPlan = {
      id: 'PL-004',
      name: 'Premium Support',
      price: 85,
    };

    mocks.subFindPendingRenewal.mockResolvedValue([mockSub]);
    mocks.planFindById.mockResolvedValue(mockPlan);
    mocks.invoiceFindByNumber.mockResolvedValue(null);
    mocks.subUpdateRenewal.mockResolvedValue(mockSub);

    await subscriptionScheduler.checkAndRenewSubscriptions();

    expect(mocks.planFindById).toHaveBeenCalledWith('PL-004');
    expect(mocks.subUpdateRenewal).toHaveBeenCalled();
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-999',
        status: InvoiceStatus.PAID,
        tenant_id: 'tenant-abc',
      })
    );
    expect(mocks.createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-999',
        title: 'Subscription Renewed',
      })
    );
  });

  it('should successfully renew a real PayPal subscription if PayPal advanced billing time', async () => {
    const mockSub = {
      id: 'sub-123',
      client_id: 'client-999',
      service_name: 'Premium Support (Monthly)',
      plan: 'PL-004',
      status: 'ACTIVE',
      renewal_date: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      equipment_count: 3,
      paypal_order_id: 'I-999888777',
      tenant_id: 'tenant-abc',
    };

    const mockPlan = {
      id: 'PL-004',
      name: 'Premium Support',
      price: 85,
    };

    const nextBillingTime = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days from now

    mocks.subFindPendingRenewal.mockResolvedValue([mockSub]);
    mocks.planFindById.mockResolvedValue(mockPlan);
    mocks.paypalGetSubscription.mockResolvedValue({
      status: 'ACTIVE',
      nextBillingTime,
    });
    mocks.invoiceFindByNumber.mockResolvedValue(null);
    mocks.subUpdateRenewal.mockResolvedValue(mockSub);

    await subscriptionScheduler.checkAndRenewSubscriptions();

    expect(mocks.paypalGetSubscription).toHaveBeenCalledWith('I-999888777');
    expect(mocks.subUpdateRenewal).toHaveBeenCalledWith('sub-123', expect.any(Date), 'ACTIVE');
    expect(mocks.invoiceCreate).toHaveBeenCalled();
  });

  it('should cancel subscription locally if PayPal subscription is cancelled', async () => {
    const mockSub = {
      id: 'sub-123',
      client_id: 'client-999',
      service_name: 'Premium Support (Monthly)',
      plan: 'PL-004',
      status: 'ACTIVE',
      renewal_date: new Date(Date.now() - 3600 * 1000),
      equipment_count: 3,
      paypal_order_id: 'I-999888777',
      tenant_id: 'tenant-abc',
    };

    const mockPlan = {
      id: 'PL-004',
      name: 'Premium Support',
      price: 85,
    };

    mocks.subFindPendingRenewal.mockResolvedValue([mockSub]);
    mocks.planFindById.mockResolvedValue(mockPlan);
    mocks.paypalGetSubscription.mockResolvedValue({
      status: 'CANCELLED',
      nextBillingTime: new Date().toISOString(),
    });

    await subscriptionScheduler.checkAndRenewSubscriptions();

    expect(mocks.paypalGetSubscription).toHaveBeenCalledWith('I-999888777');
    expect(mocks.subUpdateStatus).toHaveBeenCalledWith('sub-123', SubscriptionStatus.CANCELLED);
    expect(mocks.invoiceCreate).not.toHaveBeenCalled();
    expect(mocks.createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Subscription Cancelled',
      })
    );
  });
});
