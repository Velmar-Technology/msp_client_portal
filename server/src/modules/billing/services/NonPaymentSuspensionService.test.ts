import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NonPaymentSuspensionService } from './NonPaymentSuspensionService';
import { InvoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { TenantRepository, UserRepository } from '@modules/auth';
import { NotificationService } from '@modules/notifications';
import { NextcloudService } from '@modules/system';
import { EquipmentRepository } from '@modules/equipment';
import { Invoice, InvoiceStatus, AccountStatus } from '@shared/types';
import * as emailService from '@shared/utils/emailService';

describe('NonPaymentSuspensionService', () => {
  let invoiceRepo: Partial<InvoiceRepository>;
  let tenantRepo: Partial<TenantRepository>;
  let userRepo: Partial<UserRepository>;
  let notifService: Partial<NotificationService>;
  let nextcloudSvc: Partial<NextcloudService>;
  let equipmentRepo: Partial<EquipmentRepository>;
  let service: NonPaymentSuspensionService;

  beforeEach(() => {
    vi.spyOn(emailService, 'sendInvoiceOverdueNoticeEmail').mockResolvedValue();
    vi.spyOn(emailService, 'sendAccountReadOnlyNoticeEmail').mockResolvedValue();
    vi.spyOn(emailService, 'sendAccountSuspendedNoticeEmail').mockResolvedValue();
    vi.spyOn(emailService, 'sendAccountPurgedNoticeEmail').mockResolvedValue();
    vi.spyOn(emailService, 'sendAccountRestoredEmail').mockResolvedValue();

    invoiceRepo = {
      findPendingDueInvoices: vi.fn().mockResolvedValue([]),
      findByTenant: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockResolvedValue(null),
      updateLastEmailSentAt: vi.fn().mockResolvedValue(null),
    };

    tenantRepo = {
      findById: vi.fn().mockResolvedValue({ id: 't1', name: 'Tenant 1', account_status: AccountStatus.ACTIVE }),
      updateAccountStatus: vi.fn().mockResolvedValue(null),
    };

    userRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'u1', name: 'John Doe', email: 'john@example.com', language: 'en_US' }),
      updateAccountStatusByTenant: vi.fn().mockResolvedValue(undefined),
    };

    notifService = {
      createInAppNotification: vi.fn().mockResolvedValue(null as any),
    };

    nextcloudSvc = {
      deleteUser: vi.fn().mockResolvedValue(undefined),
    };

    equipmentRepo = {
      findByTenantId: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null as any),
    };

    service = new NonPaymentSuspensionService(
      invoiceRepo as InvoiceRepository,
      tenantRepo as TenantRepository,
      userRepo as UserRepository,
      notifService as NotificationService,
      nextcloudSvc as NextcloudService,
      equipmentRepo as EquipmentRepository
    );
  });

  describe('calculateOverdueDays', () => {
    it('returns 0 if invoice is not past due', () => {
      const futureDue = new Date(Date.now() + 86400000);
      const inv: Invoice = {
        id: '1',
        invoice_number: 'INV-1',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: futureDue,
        tenant_id: 't1',
        created_at: new Date(),
      };

      expect(service.calculateOverdueDays(inv)).toBe(0);
    });

    it('calculates elapsed days correctly when past due', () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-08-25T12:00:00Z'); // 5 days past due

      const inv: Invoice = {
        id: '1',
        invoice_number: 'INV-1',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: dueDate,
        tenant_id: 't1',
        created_at: new Date(),
      };

      expect(service.calculateOverdueDays(inv, now)).toBe(5);
    });
  });

  describe('evaluateOverdueAccounts', () => {
    it('sends Day 1 notice when invoice is 2 days overdue', async () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-08-28T12:00:00Z'); // 2 days past due

      const inv: Invoice = {
        id: 'inv-1',
        invoice_number: 'INV-1',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: dueDate,
        tenant_id: 't1',
        created_at: new Date(),
      };

      vi.mocked(invoiceRepo.findPendingDueInvoices!).mockResolvedValue([inv]);

      const result = await service.evaluateOverdueAccounts(now);

      expect(result.noticesSent).toBe(1);
      expect(emailService.sendInvoiceOverdueNoticeEmail).toHaveBeenCalledTimes(1);
      expect(notifService.createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INVOICE_OVERDUE_DAY_1' })
      );
      expect(result.readOnlyApplied).toBe(0);
    });

    it('applies Day 5 Read-Only mode when invoice is 6 days overdue', async () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-08-24T12:00:00Z'); // 6 days past due

      const inv: Invoice = {
        id: 'inv-2',
        invoice_number: 'INV-2',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: dueDate,
        tenant_id: 't1',
        created_at: new Date(),
      };

      vi.mocked(invoiceRepo.findPendingDueInvoices!).mockResolvedValue([inv]);

      const result = await service.evaluateOverdueAccounts(now);

      expect(result.readOnlyApplied).toBe(1);
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.READ_ONLY,
        expect.objectContaining({ read_only_at: now })
      );
      expect(userRepo.updateAccountStatusByTenant).toHaveBeenCalledWith('t1', AccountStatus.READ_ONLY);
      expect(emailService.sendAccountReadOnlyNoticeEmail).toHaveBeenCalledTimes(1);
    });

    it('applies Day 15 full suspension when invoice is 16 days overdue', async () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-08-14T12:00:00Z'); // 16 days past due

      const inv: Invoice = {
        id: 'inv-3',
        invoice_number: 'INV-3',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: dueDate,
        tenant_id: 't1',
        created_at: new Date(),
      };

      vi.mocked(invoiceRepo.findPendingDueInvoices!).mockResolvedValue([inv]);

      const result = await service.evaluateOverdueAccounts(now);

      expect(result.suspensionsApplied).toBe(1);
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.SUSPENDED,
        expect.objectContaining({ suspended_at: now })
      );
      expect(userRepo.updateAccountStatusByTenant).toHaveBeenCalledWith('t1', AccountStatus.SUSPENDED, false);
      expect(emailService.sendAccountSuspendedNoticeEmail).toHaveBeenCalledTimes(1);
    });

    it('executes Day 30 technical data purge when invoice is 31 days overdue', async () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-07-29T12:00:00Z'); // 32 days past due

      const inv: Invoice = {
        id: 'inv-4',
        invoice_number: 'INV-4',
        client_id: 'u1',
        amount: 100,
        tax_amount: 18,
        total: 118,
        status: InvoiceStatus.PENDING,
        invoice_date: new Date(),
        due_date: dueDate,
        tenant_id: 't1',
        created_at: new Date(),
      };

      vi.mocked(invoiceRepo.findPendingDueInvoices!).mockResolvedValue([inv]);
      vi.mocked(equipmentRepo.findByTenantId!).mockResolvedValue([
        { id: 'slot-1', nextcloud_username: 'nc_user_1' } as any,
      ]);

      const result = await service.evaluateOverdueAccounts(now);

      expect(result.purgesExecuted).toBe(1);
      expect(nextcloudSvc.deleteUser).toHaveBeenCalledWith('nc_user_1');
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.PURGED,
        expect.objectContaining({ purged_at: now })
      );
      expect(emailService.sendAccountPurgedNoticeEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreAccountIfPaid', () => {
    it('restores READ_ONLY tenant to ACTIVE when all overdue invoices are settled', async () => {
      vi.mocked(invoiceRepo.findByTenant!).mockResolvedValue([
        { id: 'inv-paid', status: InvoiceStatus.PAID, total: 100, due_date: new Date('2026-08-20') } as any,
      ]);
      vi.mocked(tenantRepo.findById!).mockResolvedValue({
        id: 't1',
        name: 'Tenant 1',
        account_status: AccountStatus.READ_ONLY,
      } as any);

      const restored = await service.restoreAccountIfPaid('u1', 't1');

      expect(restored).toBe(true);
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.ACTIVE,
        expect.objectContaining({ read_only_at: null, suspended_at: null })
      );
      expect(userRepo.updateAccountStatusByTenant).toHaveBeenCalledWith('t1', AccountStatus.ACTIVE, true);
      expect(emailService.sendAccountRestoredEmail).toHaveBeenCalledTimes(1);
    });

    it('does not restore if an unsettled overdue invoice remains', async () => {
      vi.mocked(invoiceRepo.findByTenant!).mockResolvedValue([
        { id: 'inv-unpaid', status: InvoiceStatus.OVERDUE, total: 100, due_date: new Date('2026-08-20') } as any,
      ]);

      const restored = await service.restoreAccountIfPaid('u1', 't1');
      expect(restored).toBe(false);
      expect(tenantRepo.updateAccountStatus).not.toHaveBeenCalled();
    });
  });
});
