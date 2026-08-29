import { InvoiceManagementService, invoiceManagementService, EnrichedInvoice } from '@modules/billing/services/InvoiceManagementService';
import { InvoicePaymentService, invoicePaymentService } from '@modules/billing/services/InvoicePaymentService';
import { FinancialStatsService, financialStatsService, FinancialRange, FinancialStatsResult } from '@modules/billing/services/FinancialStatsService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { Invoice, UserRole } from '@shared/types';

/**
 * Primary domain facade orchestrating invoice queries, PayPal checkout, manual mark-as-paid,
 * cancellations, PDF generation, financial statistics, and automated due notifications.
 *
 * @see BL-401 (Subscription Reactivation upon Payment)
 */
export class InvoiceService {
  /**
   * Initializes InvoiceService with underlying sub-services.
   *
   * @param mgmtService - Invoice management and enrichment service
   * @param paymentService - Invoice payment and settlement service
   * @param statsService - Financial analytics service
   * @param notifService - Invoice notification and anti-spam service
   */
  constructor(
    private mgmtService: InvoiceManagementService = invoiceManagementService,
    private paymentService: InvoicePaymentService = invoicePaymentService,
    private statsService: FinancialStatsService = financialStatsService,
    private notifService: InvoiceNotificationService = invoiceNotificationService
  ) {}

  /**
   * Retrieves paginated invoices scoped to tenant and user role.
   *
   * @param tenantId - Calling user tenant UUID
   * @param userRole - Calling user role
   * @param page - Page number
   * @param limit - Page size
   * @returns List of enriched invoices and total count
   */
  async getClientInvoices(
    tenantId: string,
    userRole: UserRole,
    page = 1,
    limit = 20
  ): Promise<{ invoices: EnrichedInvoice[]; total: number }> {
    return this.mgmtService.getClientInvoices(tenantId, userRole, page, limit);
  }

  /**
   * Retrieves an invoice by UUID with multi-tenant access control checks.
   *
   * @param id - Invoice UUID
   * @param tenantId - Calling user tenant UUID
   * @param userRole - Calling user role
   * @returns Invoice entity
   * @throws {NotFoundError} When invoice is not found
   * @throws {ForbiddenError} When access is unauthorized
   */
  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    return this.mgmtService.getInvoiceById(id, tenantId, userRole);
  }

  /**
   * Creates a PayPal checkout order for an invoice.
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @returns Object with PayPal order ID
   * @throws {ValidationError} When invoice is already paid
   */
  async createPaypalOrder(id: string, tenantId: string, userRole: UserRole): Promise<{ orderId: string }> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.createPaypalOrder(invoice);
  }

  /**
   * Captures an approved PayPal payment, marks invoice PAID, and reactivates expired subscriptions.
   *
   * @param id - Invoice UUID
   * @param paypalOrderId - PayPal order ID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @returns Updated invoice entity
   * @see BL-401
   */
  async capturePaypalOrder(id: string, paypalOrderId: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.capturePaypalOrder(invoice, paypalOrderId);
  }

  /**
   * Manually marks an invoice as paid (Admin only).
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role (must be ADMIN)
   * @returns Updated invoice entity
   * @see BL-401
   */
  async markAsPaid(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.markAsPaid(invoice, userRole);
  }

  /**
   * Cancels an unpaid invoice and cancels any linked expired subscriptions.
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param userId - Calling user ID
   * @param reason - Optional cancellation reason
   * @returns Cancelled invoice entity
   */
  async cancelInvoice(id: string, tenantId: string, userRole: UserRole, userId: string, reason?: string): Promise<Invoice> {
    return this.mgmtService.cancelInvoice(id, tenantId, userRole, userId, reason);
  }

  /**
   * Generates a binary PDF buffer and filename for an invoice.
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param lang - Optional language preference
   * @returns Object with PDF buffer and invoice number
   */
  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    return this.mgmtService.downloadInvoice(id, tenantId, userRole, lang);
  }

  /**
   * Retrieves executive financial KPIs and chart data for the selected range.
   *
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param range - Time horizon ('30_days', 'quarter', 'year')
   * @returns Financial statistics dataset
   */
  async getFinancialStats(tenantId: string, userRole: UserRole, range: FinancialRange): Promise<FinancialStatsResult> {
    return this.statsService.getFinancialStats(tenantId, userRole, range);
  }

  // Delegation helpers for anti-spam & email notifications
  /** Minimum interval enforced between recurring payment reminder emails. */
  get MIN_NOTIFICATION_INTERVAL_MS() {
    return this.notifService.MIN_NOTIFICATION_INTERVAL_MS;
  }

  /**
   * Checks whether an invoice reminder email can be sent based on 3-day minimum interval anti-spam rules.
   *
   * @param lastSentAt - Previous notification timestamp
   * @param now - Reference timestamp
   * @returns True if eligible for email notification
   */
  isEligibleForEmailNotification(lastSentAt: Date | string | null | undefined, now = new Date()): boolean {
    return this.notifService.isEligibleForEmailNotification(lastSentAt, now);
  }

  /**
   * Evaluates and sends an email payment reminder for an unpaid due invoice.
   *
   * @param invoice - Invoice entity
   * @param now - Reference timestamp
   * @returns True if email was successfully sent
   */
  async processDueInvoiceEmailNotification(invoice: Invoice, now = new Date()): Promise<boolean> {
    return this.notifService.processDueInvoiceEmailNotification(invoice, now);
  }

  /**
   * Sweeps all pending overdue/due invoices and sends eligible email reminders.
   *
   * @param now - Reference timestamp
   * @returns Count of emails sent
   */
  async checkAndSendDueInvoiceNotifications(now = new Date()): Promise<number> {
    return this.notifService.checkAndSendDueInvoiceNotifications(now);
  }
}

export const invoiceService = new InvoiceService();
