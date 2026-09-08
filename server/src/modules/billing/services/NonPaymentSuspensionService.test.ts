import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NonPaymentSuspensionService } from './NonPaymentSuspensionService';
import { InvoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { TenantRepository, UserRepository } from '@modules/auth';
import { NotificationService } from '@modules/notifications';
import { NextcloudService, VaultwardenService } from '@modules/system';
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
  let vaultwardenSvc: Partial<VaultwardenService>;
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

    vaultwardenSvc = {
      setOrganizationReadOnly: vi.fn().mockResolvedValue(true),
      deactivateOrganizationUsers: vi.fn().mockResolvedValue(1),
      reactivateOrganizationUsers: vi.fn().mockResolvedValue(1),
      deleteOrganization: vi.fn().mockResolvedValue(true),
      exportOrganizationEncrypted: vi.fn().mockResolvedValue({
        data: '{"encrypted":true}',
        filename: 'vault_escrow_backup_t1.json',
      }),
    };

    service = new NonPaymentSuspensionService(
      invoiceRepo as InvoiceRepository,
      tenantRepo as TenantRepository,
      userRepo as UserRepository,
      notifService as NotificationService,
      nextcloudSvc as NextcloudService,
      equipmentRepo as EquipmentRepository,
      vaultwardenSvc as VaultwardenService
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
      expect(vaultwardenSvc.setOrganizationReadOnly).toHaveBeenCalledWith('t1', true);
      expect(emailService.sendAccountReadOnlyNoticeEmail).toHaveBeenCalledTimes(1);
    });

    it('applies Day 15 full suspension when invoice is 16 days overdue and no grace active', async () => {
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
      expect(vaultwardenSvc.deactivateOrganizationUsers).toHaveBeenCalledWith('t1');
      expect(emailService.sendAccountSuspendedNoticeEmail).toHaveBeenCalledTimes(1);
    });

    it('defers Day 15 suspension when tenant has active emergency grace extension', async () => {
      const now = new Date('2026-08-30T12:00:00Z');
      const dueDate = new Date('2026-08-14T12:00:00Z'); // 16 days past due
      const futureGrace = new Date('2026-08-31T12:00:00Z'); // 24h grace active

      vi.mocked(tenantRepo.findById!).mockResolvedValue({
        id: 't1',
        name: 'Tenant 1',
        account_status: AccountStatus.READ_ONLY,
        vault_grace_extension_until: futureGrace,
      } as any);

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

      expect(result.suspensionsApplied).toBe(0);
      expect(tenantRepo.updateAccountStatus).not.toHaveBeenCalledWith('t1', AccountStatus.SUSPENDED, expect.anything());
      expect(vaultwardenSvc.deactivateOrganizationUsers).not.toHaveBeenCalled();
    });

    it('executes Day 30 technical data purge with encrypted vault export when invoice is 31 days overdue', async () => {
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
      expect(vaultwardenSvc.exportOrganizationEncrypted).toHaveBeenCalledWith('t1');
      expect(nextcloudSvc.deleteUser).toHaveBeenCalledWith('nc_user_1');
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.PURGED,
        expect.objectContaining({ purged_at: now })
      );
      expect(emailService.sendAccountPurgedNoticeEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
        'en_US',
        expect.objectContaining({ filename: 'vault_escrow_backup_t1.json' })
      );
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
        expect.objectContaining({
          read_only_at: null,
          suspended_at: null,
          vault_grace_extension_until: null,
          vault_grace_extensions_count: 0,
        })
      );
      expect(userRepo.updateAccountStatusByTenant).toHaveBeenCalledWith('t1', AccountStatus.ACTIVE, true);
      expect(vaultwardenSvc.setOrganizationReadOnly).toHaveBeenCalledWith('t1', false);
      expect(vaultwardenSvc.reactivateOrganizationUsers).toHaveBeenCalledWith('t1');
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

  describe('requestVaultGraceExtension (BL-702 Day 15)', () => {
    it('grants a 24-hour emergency grace extension for delinquent tenant', async () => {
      vi.mocked(tenantRepo.findById!).mockResolvedValue({
        id: 't1',
        name: 'Tenant 1',
        account_status: AccountStatus.READ_ONLY,
        vault_grace_extensions_count: 0,
      } as any);

      const result = await service.requestVaultGraceExtension('u1', 't1', 'Waiting on wire transfer');

      expect(result.granted).toBe(true);
      expect(result.extensionsCount).toBe(1);
      expect(result.maxExtensions).toBe(1);
      expect(tenantRepo.updateAccountStatus).toHaveBeenCalledWith(
        't1',
        AccountStatus.READ_ONLY,
        expect.objectContaining({
          vault_grace_extension_until: expect.any(Date),
          vault_grace_extensions_count: 1,
        })
      );
      expect(vaultwardenSvc.reactivateOrganizationUsers).toHaveBeenCalledWith('t1');
      expect(notifService.createInAppNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects when emergency grace extension was already used in current cycle', async () => {
      vi.mocked(tenantRepo.findById!).mockResolvedValue({
        id: 't1',
        name: 'Tenant 1',
        account_status: AccountStatus.SUSPENDED,
        vault_grace_extensions_count: 1,
      } as any);

      await expect(service.requestVaultGraceExtension('u1', 't1')).rejects.toThrow(
        /Emergency 24-hour grace extension has already been utilized/
      );
    });

    it('rejects when account is already in ACTIVE status', async () => {
      vi.mocked(tenantRepo.findById!).mockResolvedValue({
        id: 't1',
        name: 'Tenant 1',
        account_status: AccountStatus.ACTIVE,
        vault_grace_extensions_count: 0,
      } as any);

      await expect(service.requestVaultGraceExtension('u1', 't1')).rejects.toThrow(
        /Account is in active status/
      );
    });
  });
});
