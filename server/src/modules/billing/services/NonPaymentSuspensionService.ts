import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { TenantRepository, tenantRepository, UserRepository, userRepository } from '@modules/auth';
import { NotificationService, notificationService } from '@modules/notifications';
import { NextcloudService, nextcloudService } from '@modules/system';
import { EquipmentRepository, equipmentRepository } from '@modules/equipment';
import { Invoice, InvoiceStatus, AccountStatus } from '@shared/types';
import { NON_PAYMENT_SCALE_DAYS } from '@shared/config/constants';
import {
  sendInvoiceOverdueNoticeEmail,
  sendAccountReadOnlyNoticeEmail,
  sendAccountSuspendedNoticeEmail,
  sendAccountPurgedNoticeEmail,
  sendAccountRestoredEmail,
} from '@shared/utils/emailService';
import { logger } from '@shared/utils/logger';

/**
 * Domain service managing the 4-tier Non-Payment Suspension Scale and automated account restoration workflows.
 *
 * @see Section 9.3 (Non-Payment Suspension Scale):
 * - Day 1: Automated electronic collection notification.
 * - Day 5: Account changed to "Read-only mode" (no new files can be uploaded or modified).
 * - Day 15: Full suspension of access to platform and support services.
 * - Day 30: Permanent technical purge and deletion of data from servers for storage liberation, with zero liability.
 */
export class NonPaymentSuspensionService {
  /** Anti-spam throttle interval for overdue notice emails (24 hours in ms). */
  readonly NOTICE_EMAIL_THROTTLE_MS = 24 * 60 * 60 * 1000;

  /**
   * Initializes NonPaymentSuspensionService with repository, notification, and system dependencies.
   *
   * @param invoiceRepo - Invoice repository
   * @param tenantRepo - Tenant repository
   * @param userRepo - User repository
   * @param notifService - In-app notification service
   * @param nextcloudSvc - Nextcloud storage service
   * @param equipmentRepo - Equipment inventory repository
   */
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private tenantRepo: TenantRepository = tenantRepository,
    private userRepo: UserRepository = userRepository,
    private notifService: NotificationService = notificationService,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private equipmentRepo: EquipmentRepository = equipmentRepository,
  ) {}

  /**
   * Calculates the integer number of elapsed days past the invoice due date.
   *
   * @param invoice - Target invoice entity
   * @param now - Current reference timestamp
   * @returns Elapsed overdue days (0 if not past due)
   */
  calculateOverdueDays(invoice: Invoice, now = new Date()): number {
    const dueMs = new Date(invoice.due_date).getTime();
    const nowMs = now.getTime();
    if (nowMs <= dueMs) return 0;
    return Math.floor((nowMs - dueMs) / (24 * 60 * 60 * 1000));
  }

  /**
   * Main evaluation sweep running periodically in background daemon to enforce Section 9.3 milestones.
   *
   * @param now - Reference current timestamp
   * @returns Summary counters of actions executed during the evaluation run
   */
  async evaluateOverdueAccounts(now = new Date()): Promise<{
    evaluatedInvoices: number;
    noticesSent: number;
    readOnlyApplied: number;
    suspensionsApplied: number;
    purgesExecuted: number;
  }> {
    const pendingInvoices = await this.invoiceRepo.findPendingDueInvoices();
    let noticesSent = 0;
    let readOnlyApplied = 0;
    let suspensionsApplied = 0;
    let purgesExecuted = 0;

    // Group overdue invoices by tenant
    const tenantInvoicesMap = new Map<string, Invoice[]>();
    for (const inv of pendingInvoices) {
      const overdueDays = this.calculateOverdueDays(inv, now);
      if (overdueDays >= 1) {
        if (inv.status === InvoiceStatus.PENDING) {
          await this.invoiceRepo.updateStatus(inv.id, InvoiceStatus.OVERDUE);
          inv.status = InvoiceStatus.OVERDUE;
        }

        const list = tenantInvoicesMap.get(inv.tenant_id) || [];
        list.push(inv);
        tenantInvoicesMap.set(inv.tenant_id, list);
      }
    }

    for (const [tenantId, tenantInvoices] of tenantInvoicesMap.entries()) {
      try {
        const tenant = await this.tenantRepo.findById(tenantId);
        if (!tenant) continue;

        const maxOverdueDays = Math.max(
          ...tenantInvoices.map((inv) => this.calculateOverdueDays(inv, now))
        );

        const primaryInvoice = tenantInvoices[0];
        const client = await this.userRepo.findById(primaryInvoice.client_id);
        const lang = client?.language || 'en_US';

        // 1. Day 1+: Automated electronic collection notification
        if (maxOverdueDays >= NON_PAYMENT_SCALE_DAYS.DAY_1_NOTICE) {
          for (const inv of tenantInvoices) {
            const lastSentMs = inv.last_email_sent_at ? new Date(inv.last_email_sent_at).getTime() : 0;
            if (now.getTime() - lastSentMs >= this.NOTICE_EMAIL_THROTTLE_MS) {
              if (client && client.email) {
                await sendInvoiceOverdueNoticeEmail(
                  client.email,
                  client.name,
                  inv,
                  this.calculateOverdueDays(inv, now),
                  lang
                );
                await this.invoiceRepo.updateLastEmailSentAt(inv.id, now);
                noticesSent++;
              }

              await this.notifService.createInAppNotification({
                userId: inv.client_id,
                title: 'Invoice Overdue Notice',
                message: `Invoice ${inv.invoice_number} is overdue by ${this.calculateOverdueDays(inv, now)} day(s). Settle payment to avoid account restriction.`,
                link: `/billing?openModal=pay-invoice&invoiceId=${inv.id}`,
                type: 'INVOICE_OVERDUE_DAY_1',
                tenantId,
              });
            }
          }
        }

        // 2. Day 5+: Account changed to "Read-only mode"
        if (
          maxOverdueDays >= NON_PAYMENT_SCALE_DAYS.DAY_5_READ_ONLY &&
          tenant.account_status === AccountStatus.ACTIVE
        ) {
          await this.tenantRepo.updateAccountStatus(tenantId, AccountStatus.READ_ONLY, {
            read_only_at: now,
          });
          await this.userRepo.updateAccountStatusByTenant(tenantId, AccountStatus.READ_ONLY);

          if (client && client.email) {
            await sendAccountReadOnlyNoticeEmail(client.email, client.name, lang);
          }

          await this.notifService.createInAppNotification({
            userId: primaryInvoice.client_id,
            title: 'Account in Read-Only Mode',
            message: 'Your account is now in Read-Only mode due to overdue invoices (Day 5). File uploads and ticket creation are locked.',
            link: '/billing',
            type: 'ACCOUNT_READ_ONLY_DAY_5',
            tenantId,
          });

          readOnlyApplied++;
          logger.warn(`Tenant ${tenantId} placed in READ_ONLY mode due to ${maxOverdueDays} days overdue.`);
        }

        // 3. Day 15+: Full suspension of access to platform and support services
        if (
          maxOverdueDays >= NON_PAYMENT_SCALE_DAYS.DAY_15_SUSPENSION &&
          (tenant.account_status === AccountStatus.ACTIVE || tenant.account_status === AccountStatus.READ_ONLY)
        ) {
          await this.tenantRepo.updateAccountStatus(tenantId, AccountStatus.SUSPENDED, {
            suspended_at: now,
          });
          await this.userRepo.updateAccountStatusByTenant(tenantId, AccountStatus.SUSPENDED, false);

          if (client && client.email) {
            await sendAccountSuspendedNoticeEmail(client.email, client.name, lang);
          }

          await this.notifService.createInAppNotification({
            userId: primaryInvoice.client_id,
            title: 'Service Access Suspended',
            message: 'Platform and support access has been suspended due to 15 days non-payment. Settle your balance before Day 30 data purge.',
            link: '/billing',
            type: 'ACCOUNT_SUSPENDED_DAY_15',
            tenantId,
          });

          suspensionsApplied++;
          logger.warn(`Tenant ${tenantId} placed in SUSPENDED mode due to ${maxOverdueDays} days overdue.`);
        }

        // 4. Day 30+: Permanent technical purge and deletion of data from servers
        if (
          maxOverdueDays >= NON_PAYMENT_SCALE_DAYS.DAY_30_PURGE &&
          tenant.account_status !== AccountStatus.PURGED
        ) {
          await this.purgeTenantData(tenantId);
          await this.tenantRepo.updateAccountStatus(tenantId, AccountStatus.PURGED, {
            purged_at: now,
          });
          await this.userRepo.updateAccountStatusByTenant(tenantId, AccountStatus.PURGED, false);

          if (client && client.email) {
            await sendAccountPurgedNoticeEmail(client.email, client.name, lang);
          }

          await this.notifService.createInAppNotification({
            userId: primaryInvoice.client_id,
            title: 'Account Data Purged',
            message: 'Permanent technical purge of account data executed per Section 9.3 due to 30 days non-payment.',
            type: 'ACCOUNT_PURGED_DAY_30',
            tenantId,
          });

          purgesExecuted++;
          logger.warn(`Tenant ${tenantId} data PURGED due to ${maxOverdueDays} days overdue.`);
        }
      } catch (err) {
        logger.error(`Error processing non-payment scale for tenant ${tenantId}`, { err });
      }
    }

    return {
      evaluatedInvoices: pendingInvoices.length,
      noticesSent,
      readOnlyApplied,
      suspensionsApplied,
      purgesExecuted,
    };
  }

  /**
   * Executes technical data purge for storage liberation upon reaching Day 30 of non-payment.
   * Cleans up external Nextcloud user storage accounts and resets provisioned equipment credentials.
   *
   * @param tenantId - Target tenant UUID
   */
  async purgeTenantData(tenantId: string): Promise<void> {
    try {
      const equipmentSlots = await this.equipmentRepo.findByTenantId(tenantId);
      for (const slot of equipmentSlots) {
        if (slot.nextcloud_username) {
          try {
            await this.nextcloudSvc.deleteUser(slot.nextcloud_username);
            logger.info(`Purged Nextcloud user ${slot.nextcloud_username} for tenant ${tenantId}`);
          } catch (err) {
            logger.warn(`Could not delete Nextcloud user ${slot.nextcloud_username}`, { err });
          }
        }
        await this.equipmentRepo.update(slot.id, {
          nextcloud_username: null,
          nextcloud_password: null,
          agent_token: null,
          agent_instance_id: null,
          agent_hostname: null,
          agent_serial: null,
          device_name: null,
          device_serial: null,
          otp: null,
          status: 'PENDING_ACTIVATION',
        });
      }
    } catch (err) {
      logger.error(`Failed purging tenant equipment and storage data for ${tenantId}`, { err });
    }
  }

  /**
   * Restores an account from READ_ONLY or SUSPENDED state back to ACTIVE once all overdue invoices are settled.
   *
   * @param clientId - Client user UUID
   * @param tenantId - Tenant UUID
   * @returns True if account was restored
   */
  async restoreAccountIfPaid(clientId: string, tenantId: string): Promise<boolean> {
    const tenantInvoices = await this.invoiceRepo.findByTenant(tenantId, 100, 0);
    const now = new Date();

    const hasUnsettledOverdue = tenantInvoices.some(
      (inv) =>
        (inv.status === InvoiceStatus.PENDING || inv.status === InvoiceStatus.OVERDUE) &&
        this.calculateOverdueDays(inv, now) >= 1
    );

    if (hasUnsettledOverdue) {
      return false;
    }

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) return false;

    if (tenant.account_status === AccountStatus.READ_ONLY || tenant.account_status === AccountStatus.SUSPENDED) {
      await this.tenantRepo.updateAccountStatus(tenantId, AccountStatus.ACTIVE, {
        read_only_at: null,
        suspended_at: null,
      });
      await this.userRepo.updateAccountStatusByTenant(tenantId, AccountStatus.ACTIVE, true);

      const client = await this.userRepo.findById(clientId);
      const lang = client?.language || 'en_US';

      if (client && client.email) {
        await sendAccountRestoredEmail(client.email, client.name, lang);
      }

      await this.notifService.createInAppNotification({
        userId: clientId,
        title: 'Account Restored to Active',
        message: 'Your payment was processed and all operational restrictions have been lifted. Your account is fully active.',
        link: '/dashboard',
        type: 'ACCOUNT_RESTORED',
        tenantId,
      });

      logger.info(`Tenant ${tenantId} restored to ACTIVE status after settling overdue invoices.`);
      return true;
    }

    return false;
  }
}

export const nonPaymentSuspensionService = new NonPaymentSuspensionService();
