import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceService } from '@modules/billing/services/InvoiceService';
import { InvoiceStatus, Invoice } from '@shared/types';
import * as emailService from '@shared/utils/emailService';
import { invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { userRepository } from '@modules/auth';

vi.mock('@modules/billing/repositories/InvoiceRepository', () => ({
  invoiceRepository: {
    findById: vi.fn(),
    updateLastEmailSentAt: vi.fn(),
    findPendingDueInvoices: vi.fn(),
  },
}));

vi.mock('@modules/auth/repositories/UserRepository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('@shared/utils/emailService', () => ({
  sendInvoiceDueEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Invoice Due Payment Email Notification Anti-Spam (3-Day Limit)', () => {
  const mockNow = new Date('2026-08-10T12:00:00Z');

  const baseInvoice: Invoice = {
    id: 'inv-123',
    invoice_number: 'INV-2026-0001',
    client_id: 'user-456',
    amount: 100,
    tax_amount: 18,
    total: 118,
    status: InvoiceStatus.PENDING,
    invoice_date: new Date('2026-08-01T12:00:00Z'),
    due_date: new Date('2026-08-15T12:00:00Z'),
    tenant_id: 'tenant-789',
    last_email_sent_at: null,
    created_at: new Date('2026-08-01T12:00:00Z'),
  };

  const mockUser = {
    id: 'user-456',
    name: 'Jane Client',
    email: 'jane@example.com',
    language: 'en_US',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isEligibleForEmailNotification', () => {
    it('should return true if last_email_sent_at is null or undefined', () => {
      expect(invoiceService.isEligibleForEmailNotification(null, mockNow)).toBe(true);
      expect(invoiceService.isEligibleForEmailNotification(undefined, mockNow)).toBe(true);
    });

    it('should return false if last notification was sent less than 3 days ago (e.g. 1 day ago)', () => {
      const oneDayAgo = new Date('2026-08-09T12:00:00Z');
      expect(invoiceService.isEligibleForEmailNotification(oneDayAgo, mockNow)).toBe(false);
    });

    it('should return false if last notification was sent 2.5 days ago', () => {
      const twoAndHalfDaysAgo = new Date('2026-08-08T00:00:00Z');
      expect(invoiceService.isEligibleForEmailNotification(twoAndHalfDaysAgo, mockNow)).toBe(false);
    });

    it('should return true if last notification was sent exactly 3 days ago', () => {
      const threeDaysAgo = new Date('2026-08-07T12:00:00Z');
      expect(invoiceService.isEligibleForEmailNotification(threeDaysAgo, mockNow)).toBe(true);
    });

    it('should return true if last notification was sent 5 days ago', () => {
      const fiveDaysAgo = new Date('2026-08-05T12:00:00Z');
      expect(invoiceService.isEligibleForEmailNotification(fiveDaysAgo, mockNow)).toBe(true);
    });
  });

  describe('processDueInvoiceEmailNotification', () => {
    it('should send email and update DB timestamp when last_email_sent_at is null', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(invoiceRepository.updateLastEmailSentAt).mockResolvedValue({ ...baseInvoice, last_email_sent_at: mockNow });

      const result = await invoiceService.processDueInvoiceEmailNotification(baseInvoice, mockNow);

      expect(result).toBe(true);
      expect(emailService.sendInvoiceDueEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendInvoiceDueEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'Jane Client',
        baseInvoice,
        'en_US'
      );
      expect(invoiceRepository.updateLastEmailSentAt).toHaveBeenCalledWith('inv-123', mockNow);
    });

    it('should send email when last_email_sent_at was 4 days ago', async () => {
      const fourDaysAgoInvoice = {
        ...baseInvoice,
        last_email_sent_at: new Date('2026-08-06T12:00:00Z'),
      };
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);

      const result = await invoiceService.processDueInvoiceEmailNotification(fourDaysAgoInvoice, mockNow);

      expect(result).toBe(true);
      expect(emailService.sendInvoiceDueEmail).toHaveBeenCalledTimes(1);
      expect(invoiceRepository.updateLastEmailSentAt).toHaveBeenCalledWith('inv-123', mockNow);
    });

    it('should SKIP email and NOT update DB timestamp when last_email_sent_at was 1 day ago', async () => {
      const oneDayAgoInvoice = {
        ...baseInvoice,
        last_email_sent_at: new Date('2026-08-09T12:00:00Z'),
      };

      const result = await invoiceService.processDueInvoiceEmailNotification(oneDayAgoInvoice, mockNow);

      expect(result).toBe(false);
      expect(emailService.sendInvoiceDueEmail).not.toHaveBeenCalled();
      expect(invoiceRepository.updateLastEmailSentAt).not.toHaveBeenCalled();
    });

    it('should SKIP email if invoice status is PAID or CANCELLED', async () => {
      const paidInvoice = { ...baseInvoice, status: InvoiceStatus.PAID };
      const cancelledInvoice = { ...baseInvoice, status: InvoiceStatus.CANCELLED };

      expect(await invoiceService.processDueInvoiceEmailNotification(paidInvoice, mockNow)).toBe(false);
      expect(await invoiceService.processDueInvoiceEmailNotification(cancelledInvoice, mockNow)).toBe(false);
      expect(emailService.sendInvoiceDueEmail).not.toHaveBeenCalled();
    });
  });

  describe('checkAndSendDueInvoiceNotifications', () => {
    it('should process pending invoices and rate limit emails properly', async () => {
      const inv1 = { ...baseInvoice, id: 'inv-1', invoice_number: 'INV-1', last_email_sent_at: null };
      const inv2 = { ...baseInvoice, id: 'inv-2', invoice_number: 'INV-2', last_email_sent_at: new Date('2026-08-09T12:00:00Z') }; // 1 day ago -> skip
      const inv3 = { ...baseInvoice, id: 'inv-3', invoice_number: 'INV-3', last_email_sent_at: new Date('2026-08-05T12:00:00Z') }; // 5 days ago -> send

      vi.mocked(invoiceRepository.findPendingDueInvoices).mockResolvedValue([inv1, inv2, inv3]);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);

      const sentCount = await invoiceService.checkAndSendDueInvoiceNotifications(mockNow);

      expect(sentCount).toBe(2); // inv1 and inv3 sent, inv2 skipped
      expect(emailService.sendInvoiceDueEmail).toHaveBeenCalledTimes(2);
    });
  });
});
