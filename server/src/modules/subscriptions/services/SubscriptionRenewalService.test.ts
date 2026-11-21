import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@shared/utils/emailService', () => ({
  sendInvoiceDueEmail: vi.fn().mockResolvedValue({ messageId: 'mock-msg-id' }),
}));

import { SubscriptionRenewalService } from './SubscriptionRenewalService';
import { Subscription, SubscriptionStatus, InvoiceStatus } from '@shared/types';
import { sendInvoiceDueEmail } from '@shared/utils/emailService';

describe('SubscriptionRenewalService', () => {
  let renewalService: SubscriptionRenewalService;

  const mockSubRepo = {
    updateRenewal: vi.fn().mockResolvedValue({}),
    updateStatus: vi.fn().mockResolvedValue({}),
  };

  const mockPlanRepo = {
    findById: vi.fn(),
  };

  const mockInvoiceRepo = {
    create: vi.fn(),
  };

  const mockEquipRepo = {
    findBySubscription: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  };

  const mockUserRepo = {
    findById: vi.fn(),
  };

  const mockNextcloudSvc = {
    deleteUser: vi.fn().mockResolvedValue({}),
  };

  const mockPaypalSvc = {
    getSubscription: vi.fn(),
  };

  const mockNotifSvc = {
    createInAppNotification: vi.fn().mockResolvedValue({}),
  };

  const mockPricingSvc = {
    calculatePricing: vi.fn(),
    generateInvoiceNumber: vi.fn(),
  };

  const mockNcfSvc = {
    assignNcfIfEligible: vi.fn(),
  };

  const mockTenantRepo = {
    findById: vi.fn(),
  };

  const baseSub: Subscription = {
    id: 'sub-test-1',
    client_id: 'client-1',
    tenant_id: 'tenant-1',
    service_name: 'Proactive RMM & Cloud Backup',
    plan: 'PL-003',
    status: SubscriptionStatus.ACTIVE,
    renewal_date: '2026-11-21T00:00:00.000Z',
    equipment_count: 5,
    paypal_order_id: null,
    created_at: new Date('2026-08-30'),
    updated_at: new Date('2026-11-21'),
  };

  const basePlan = {
    id: 'PL-003',
    name: 'Proactive RMM & Cloud Backup',
    price: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPlanRepo.findById.mockResolvedValue(basePlan);
    mockUserRepo.findById.mockResolvedValue({
      id: 'client-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'CLIENT',
      language: 'en',
    });
    mockTenantRepo.findById.mockResolvedValue({
      id: 'tenant-1',
      subdomain: 'clientorg',
      rnc: '131234567',
    });
    mockPricingSvc.calculatePricing.mockReturnValue({
      subtotal: 250,
      tax: 45,
      total: 295,
    });
    mockPricingSvc.generateInvoiceNumber.mockResolvedValue('INV-2026-123456');
    mockNcfSvc.assignNcfIfEligible.mockResolvedValue('B0100000001');
    mockInvoiceRepo.create.mockImplementation(async (inv: any) => ({ id: 'inv-1', ...inv }));

    renewalService = new SubscriptionRenewalService(
      mockSubRepo as any,
      mockPlanRepo as any,
      mockInvoiceRepo as any,
      mockEquipRepo as any,
      mockUserRepo as any,
      mockNextcloudSvc as any,
      mockPaypalSvc as any,
      mockNotifSvc as any,
      mockPricingSvc as any,
      mockNcfSvc as any,
      mockTenantRepo as any
    );
  });

  it('BL-402: successfully calculates pricing, creates invoice, and updates renewal date', async () => {
    await renewalService.renewSubscription(baseSub);

    // 1. Verify pricing calculation with multiplier and equipment count
    expect(mockPricingSvc.calculatePricing).toHaveBeenCalledWith(50, 5, 'monthly');
    expect(mockPricingSvc.generateInvoiceNumber).toHaveBeenCalled();
    expect(mockNcfSvc.assignNcfIfEligible).toHaveBeenCalledWith('131234567');

    // 2. Verify invoice creation with PAID status
    expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'INV-2026-123456',
        client_id: 'client-1',
        amount: 250,
        tax_amount: 45,
        total: 295,
        ncf: 'B0100000001',
        status: InvoiceStatus.PAID,
      })
    );

    // 3. Verify renewal date updated in database
    expect(mockSubRepo.updateRenewal).toHaveBeenCalledWith(
      'sub-test-1',
      expect.any(Date),
      SubscriptionStatus.ACTIVE
    );

    // 4. Verify in-app notification sent
    expect(mockNotifSvc.createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-1',
        type: 'SUBSCRIPTION_RENEWED',
      })
    );

    // 5. Verify billing email dispatched
    expect(sendInvoiceDueEmail).toHaveBeenCalledWith(
      'john@example.com',
      'John Doe',
      expect.objectContaining({ invoice_number: 'INV-2026-123456' }),
      'en'
    );
  });

  it('BL-402: calculates annual billing cycle when service name contains Annual', async () => {
    const annualSub: Subscription = {
      ...baseSub,
      service_name: 'Proactive RMM & Cloud Backup (Annual)',
    };

    await renewalService.renewSubscription(annualSub);

    expect(mockPricingSvc.calculatePricing).toHaveBeenCalledWith(50, 5, 'annual');
    expect(mockInvoiceRepo.create).toHaveBeenCalled();
    expect(mockSubRepo.updateRenewal).toHaveBeenCalled();
  });

  it('BL-402: admin/provider tenant advances renewal date without generating billing invoice', async () => {
    mockTenantRepo.findById.mockResolvedValueOnce({
      id: 'tenant-1',
      subdomain: 'admin',
    });

    await renewalService.renewSubscription(baseSub);

    expect(mockSubRepo.updateRenewal).toHaveBeenCalledWith(
      'sub-test-1',
      expect.any(Date),
      SubscriptionStatus.ACTIVE
    );
    expect(mockPricingSvc.calculatePricing).not.toHaveBeenCalled();
    expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
  });

  it('BL-402: does not advance renewal date if invoice creation fails', async () => {
    mockInvoiceRepo.create.mockRejectedValueOnce(new Error('Database connection failed'));

    await expect(renewalService.renewSubscription(baseSub)).rejects.toThrow('Database connection failed');

    // Crucial invariant: updateRenewal must NOT be called if invoice generation fails
    expect(mockSubRepo.updateRenewal).not.toHaveBeenCalled();
  });

  it('BL-402: finalizes EXPIRING subscription by de-provisioning slots and cancelling', async () => {
    const expiringSub: Subscription = {
      ...baseSub,
      status: SubscriptionStatus.EXPIRING,
    };

    mockEquipRepo.findBySubscription.mockResolvedValueOnce([
      { id: 'slot-1', nextcloud_username: 'slot1_user' },
    ]);

    await renewalService.renewSubscription(expiringSub);

    expect(mockSubRepo.updateStatus).toHaveBeenCalledWith('sub-test-1', SubscriptionStatus.CANCELLED);
    expect(mockNextcloudSvc.deleteUser).toHaveBeenCalledWith('slot1_user');
    expect(mockEquipRepo.update).toHaveBeenCalledWith('slot-1', expect.objectContaining({
      status: 'PENDING_ACTIVATION',
    }));
    expect(mockNotifSvc.createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SUBSCRIPTION_CANCELLED',
      })
    );
  });

  it('BL-402: cancels locally if PayPal subscription is inactive', async () => {
    const paypalSub: Subscription = {
      ...baseSub,
      paypal_order_id: 'I-SUB-PAYPAL-123',
    };

    mockPaypalSvc.getSubscription.mockResolvedValueOnce({
      status: 'SUSPENDED',
      nextBillingTime: '2026-12-21T00:00:00.000Z',
    });

    await renewalService.renewSubscription(paypalSub);

    expect(mockSubRepo.updateStatus).toHaveBeenCalledWith('sub-test-1', SubscriptionStatus.CANCELLED);
    expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    expect(mockSubRepo.updateRenewal).not.toHaveBeenCalled();
  });

  it('BL-402: simulates renewal for mock PayPal subscription', async () => {
    const mockPaypalSub: Subscription = {
      ...baseSub,
      paypal_order_id: 'MOCK-SUB-12345',
    };

    await renewalService.renewSubscription(mockPaypalSub);

    expect(mockPricingSvc.calculatePricing).toHaveBeenCalled();
    expect(mockInvoiceRepo.create).toHaveBeenCalled();
    expect(mockSubRepo.updateRenewal).toHaveBeenCalled();
  });
});
