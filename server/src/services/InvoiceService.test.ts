import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findByTenant: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    countByTenant: vi.fn(),
    updateStatus: vi.fn(),
    createPaypalOrder: vi.fn(),
    capturePaypalOrder: vi.fn(),
    paypalCreateOrder: vi.fn(),
    paypalCaptureOrder: vi.fn(),
    createInAppNotification: vi.fn().mockResolvedValue({}),
    getAllForStats: vi.fn(),
    getActiveSubscriptionsWithPlan: vi.fn(),
    getExpensesForStats: vi.fn(),
    subFindByClient: vi.fn().mockResolvedValue([]),
    subUpdateStatus: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('../repositories/InvoiceRepository', () => {
  return {
    invoiceRepository: {
      findById: mocks.findById,
      findByTenant: mocks.findByTenant,
      findAll: mocks.findAll,
      count: mocks.count,
      countByTenant: mocks.countByTenant,
      updateStatus: mocks.updateStatus,
      getAllForStats: mocks.getAllForStats,
    },
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      getActiveSubscriptionsWithPlan: mocks.getActiveSubscriptionsWithPlan,
      findByClient: mocks.subFindByClient,
      updateStatus: mocks.subUpdateStatus,
    },
  };
});

vi.mock('../repositories/ExpenseRepository', () => {
  return {
    expenseRepository: {
      getAllForStats: mocks.getExpensesForStats,
    },
  };
});

vi.mock('./PaypalService', () => {
  return {
    paypalService: {
      createOrder: mocks.paypalCreateOrder,
      captureOrder: mocks.paypalCaptureOrder,
    },
  };
});

vi.mock('../repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: vi.fn().mockResolvedValue({ id: 'client-1', name: 'John Doe', email: 'john@example.com' }),
      findByRole: vi.fn().mockResolvedValue([{ id: 'admin-1', name: 'Admin User' }]),
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

import { invoiceService } from './InvoiceService';
import { UserRole, InvoiceStatus, Invoice, SubscriptionStatus } from '../types';

describe('InvoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInvoice: Invoice = {
    id: 'inv-123',
    invoice_number: 'INV-2024-001',
    client_id: 'client-1',
    amount: 100.0,
    tax_amount: 18.0,
    total: 118.0,
    status: InvoiceStatus.PENDING,
    invoice_date: new Date(),
    due_date: new Date(),
    tenant_id: 'tenant-1',
    created_at: new Date(),
  };

  describe('getClientInvoices', () => {
    it('should return all invoices for Admin role', async () => {
      mocks.findAll.mockResolvedValue([mockInvoice]);
      mocks.count.mockResolvedValue(1);

      const result = await invoiceService.getClientInvoices('tenant-1', UserRole.ADMIN, 1, 20);

      expect(mocks.findAll).toHaveBeenCalledWith(20, 0);
      expect(mocks.count).toHaveBeenCalled();
      expect(result).toEqual({ invoices: [mockInvoice], total: 1 });
    });

    it('should return tenant specific invoices for Client role', async () => {
      mocks.findByTenant.mockResolvedValue([mockInvoice]);
      mocks.countByTenant.mockResolvedValue(1);

      const result = await invoiceService.getClientInvoices('tenant-1', UserRole.CLIENT, 1, 20);

      expect(mocks.findByTenant).toHaveBeenCalledWith('tenant-1', 20, 0);
      expect(mocks.countByTenant).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ invoices: [mockInvoice], total: 1 });
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice for admin even if tenant mismatch', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);

      const result = await invoiceService.getInvoiceById('inv-123', 'different-tenant', UserRole.ADMIN);

      expect(mocks.findById).toHaveBeenCalledWith('inv-123');
      expect(result).toEqual(mockInvoice);
    });

    it('should return invoice for client if tenant matches', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);

      const result = await invoiceService.getInvoiceById('inv-123', 'tenant-1', UserRole.CLIENT);

      expect(result).toEqual(mockInvoice);
    });

    it('should throw forbidden AppError if client requests mismatched tenant invoice', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);

      await expect(
        invoiceService.getInvoiceById('inv-123', 'different-tenant', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('should throw not found AppError if invoice does not exist', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(
        invoiceService.getInvoiceById('inv-999', 'tenant-1', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('createPaypalOrder', () => {
    it('should create order and return paypal order id', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      mocks.paypalCreateOrder.mockResolvedValue({ id: 'PAYPAL-ORD-999', status: 'CREATED' });

      const result = await invoiceService.createPaypalOrder('inv-123', 'tenant-1', UserRole.CLIENT);

      expect(mocks.paypalCreateOrder).toHaveBeenCalledWith(mockInvoice);
      expect(result).toEqual({ orderId: 'PAYPAL-ORD-999' });
    });

    it('should throw error if invoice is already paid', async () => {
      mocks.findById.mockResolvedValue({
        ...mockInvoice,
        status: InvoiceStatus.PAID,
      });

      await expect(
        invoiceService.createPaypalOrder('inv-123', 'tenant-1', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invoice is already paid',
      });
    });
  });

  describe('capturePaypalOrder', () => {
    it('should return invoice immediately if already paid', async () => {
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      mocks.findById.mockResolvedValue(paidInvoice);

      const result = await invoiceService.capturePaypalOrder('inv-123', 'PAY-ORD', 'tenant-1', UserRole.CLIENT);

      expect(result).toEqual(paidInvoice);
      expect(mocks.paypalCaptureOrder).not.toHaveBeenCalled();
    });

    it('should capture order, update status to paid, and send notification', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      mocks.paypalCaptureOrder.mockResolvedValue({ status: 'COMPLETED', captureId: 'CAP-123' });
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      mocks.updateStatus.mockResolvedValue(paidInvoice);

      const result = await invoiceService.capturePaypalOrder('inv-123', 'PAY-ORD-999', 'tenant-1', UserRole.CLIENT);

      expect(mocks.paypalCaptureOrder).toHaveBeenCalledWith('PAY-ORD-999');
      expect(mocks.updateStatus).toHaveBeenCalledWith('inv-123', InvoiceStatus.PAID);
      expect(mocks.createInAppNotification).toHaveBeenCalledWith({
        userId: mockInvoice.client_id,
        title: 'Payment Received',
        message: `Your payment of $118.00 for invoice INV-2024-001 has been processed successfully.`,
        link: '/billing',
        type: 'INVOICE_PAID',
        tenantId: mockInvoice.tenant_id,
      });
      expect(result).toEqual(paidInvoice);
    });

    it('should throw error if PayPal capture status is not COMPLETED', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      mocks.paypalCaptureOrder.mockResolvedValue({ status: 'FAILED' });

      await expect(
        invoiceService.capturePaypalOrder('inv-123', 'PAY-ORD-999', 'tenant-1', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'PayPal payment was not completed',
      });
    });
  });

  describe('getFinancialStats', () => {
    it('should aggregate revenue and active subscription MRR correctly', async () => {
      const refDate = new Date('2026-07-01T12:00:00Z');
      const invoices = [
        { id: 'inv-1', invoice_number: '1', client_id: 'c1', amount: 100, tax_amount: 18, total: 118, status: InvoiceStatus.PAID, invoice_date: refDate },
        { id: 'inv-2', invoice_number: '2', client_id: 'c1', amount: 50, tax_amount: 9, total: 59, status: InvoiceStatus.PAID, invoice_date: refDate },
        { id: 'inv-3', invoice_number: '3', client_id: 'c1', amount: 200, tax_amount: 36, total: 236, status: InvoiceStatus.PENDING, invoice_date: refDate },
      ];
      mocks.getAllForStats.mockResolvedValue(invoices);

      const activeSubs = [
        { id: 'sub-1', planId: 'PL-001', equipmentCount: 2, status: SubscriptionStatus.ACTIVE, created_at: refDate, price: 30 },
      ];
      mocks.getActiveSubscriptionsWithPlan.mockResolvedValue(activeSubs);
      const mockExpenses = [
        { id: 'exp-1', amount: 150.00, description: 'Cloud hosting', category: 'cloudInfra', expense_date: refDate, tenant_id: 'tenant-1' }
      ];
      mocks.getExpensesForStats.mockResolvedValue(mockExpenses);

      const result = await invoiceService.getFinancialStats('tenant-1', UserRole.CLIENT, '30_days');

      expect(mocks.getAllForStats).toHaveBeenCalledWith('tenant-1');
      expect(mocks.getActiveSubscriptionsWithPlan).toHaveBeenCalledWith('tenant-1');

      expect(result.kpis.find(k => k.key === 'revenue')?.value).toBe('$177.00');
      expect(result.kpis.find(k => k.key === 'mrr')?.value).toBe('$60.00');
      expect(result.kpis.find(k => k.key === 'expenses')?.value).toBe('$150.00');
    });
  });

  describe('markAsPaid', () => {
    it('should throw forbidden error if role is not ADMIN', async () => {
      await expect(
        invoiceService.markAsPaid('inv-123', 'tenant-1', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only administrators can mark invoices as paid manually',
      });
    });

    it('should mark invoice as paid, activate expired subscriptions, and send notification', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      mocks.updateStatus.mockResolvedValue(paidInvoice);
      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', status: SubscriptionStatus.EXPIRED },
      ]);

      const result = await invoiceService.markAsPaid('inv-123', 'tenant-1', UserRole.ADMIN);

      expect(mocks.updateStatus).toHaveBeenCalledWith('inv-123', InvoiceStatus.PAID);
      expect(mocks.subFindByClient).toHaveBeenCalledWith('client-1', 'tenant-1');
      expect(mocks.subUpdateStatus).toHaveBeenCalledWith('sub-1', SubscriptionStatus.ACTIVE);
      expect(mocks.createInAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'client-1',
        title: 'Payment Confirmed',
      }));
      expect(result).toEqual(paidInvoice);
    });

    it('should return immediately if invoice is already paid', async () => {
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      mocks.findById.mockResolvedValue(paidInvoice);

      const result = await invoiceService.markAsPaid('inv-123', 'tenant-1', UserRole.ADMIN);

      expect(result).toEqual(paidInvoice);
      expect(mocks.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancelInvoice', () => {
    it('should throw badRequest error if invoice is already paid', async () => {
      mocks.findById.mockResolvedValue({ ...mockInvoice, status: InvoiceStatus.PAID });
      await expect(
        invoiceService.cancelInvoice('inv-123', 'tenant-1', UserRole.ADMIN, 'admin-1')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot cancel an already paid invoice',
      });
    });

    it('should return immediately if invoice is already cancelled', async () => {
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };
      mocks.findById.mockResolvedValue(cancelledInvoice);

      const result = await invoiceService.cancelInvoice('inv-123', 'tenant-1', UserRole.ADMIN, 'admin-1');

      expect(result).toEqual(cancelledInvoice);
      expect(mocks.updateStatus).not.toHaveBeenCalled();
    });

    it('should cancel pending invoice, update EXPIRED subscription to CANCELLED, and notify client', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };
      mocks.updateStatus.mockResolvedValue(cancelledInvoice);
      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', status: SubscriptionStatus.EXPIRED, created_at: mockInvoice.invoice_date },
      ]);

      const result = await invoiceService.cancelInvoice('inv-123', 'tenant-1', UserRole.ADMIN, 'admin-1', 'Bank cancellation');

      expect(mocks.updateStatus).toHaveBeenCalledWith('inv-123', InvoiceStatus.CANCELLED);
      expect(mocks.subUpdateStatus).toHaveBeenCalledWith('sub-1', SubscriptionStatus.CANCELLED);
      expect(mocks.createInAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'client-1',
        title: 'Invoice Cancelled',
      }));
      expect(result).toEqual(cancelledInvoice);
    });

    it('should notify admins if client self-cancels an invoice', async () => {
      mocks.findById.mockResolvedValue(mockInvoice);
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };
      mocks.updateStatus.mockResolvedValue(cancelledInvoice);
      mocks.subFindByClient.mockResolvedValue([]);

      await invoiceService.cancelInvoice('inv-123', 'tenant-1', UserRole.CLIENT, 'client-1', 'Decided not to pay');

      expect(mocks.createInAppNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'admin-1',
        title: 'Invoice Cancelled by Client',
      }));
    });
  });
});
