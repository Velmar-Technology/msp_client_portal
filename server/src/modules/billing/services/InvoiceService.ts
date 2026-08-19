import { InvoiceManagementService, invoiceManagementService, EnrichedInvoice } from '@modules/billing/services/InvoiceManagementService';
import { InvoicePaymentService, invoicePaymentService } from '@modules/billing/services/InvoicePaymentService';
import { FinancialStatsService, financialStatsService, FinancialRange, FinancialStatsResult } from '@modules/billing/services/FinancialStatsService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { Invoice, UserRole } from '@shared/types';

export class InvoiceService {
  constructor(
    private mgmtService: InvoiceManagementService = invoiceManagementService,
    private paymentService: InvoicePaymentService = invoicePaymentService,
    private statsService: FinancialStatsService = financialStatsService,
    private notifService: InvoiceNotificationService = invoiceNotificationService
  ) {}

  async getClientInvoices(
    tenantId: string,
    userRole: UserRole,
    page = 1,
    limit = 20
  ): Promise<{ invoices: EnrichedInvoice[]; total: number }> {
    return this.mgmtService.getClientInvoices(tenantId, userRole, page, limit);
  }

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    return this.mgmtService.getInvoiceById(id, tenantId, userRole);
  }

  async createPaypalOrder(id: string, tenantId: string, userRole: UserRole): Promise<{ orderId: string }> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.createPaypalOrder(invoice);
  }

  async capturePaypalOrder(id: string, paypalOrderId: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.capturePaypalOrder(invoice, paypalOrderId);
  }

  async markAsPaid(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.mgmtService.getInvoiceById(id, tenantId, userRole);
    return this.paymentService.markAsPaid(invoice, userRole);
  }

  async cancelInvoice(id: string, tenantId: string, userRole: UserRole, userId: string, reason?: string): Promise<Invoice> {
    return this.mgmtService.cancelInvoice(id, tenantId, userRole, userId, reason);
  }

  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    return this.mgmtService.downloadInvoice(id, tenantId, userRole, lang);
  }

  async getFinancialStats(tenantId: string, userRole: UserRole, range: FinancialRange): Promise<FinancialStatsResult> {
    return this.statsService.getFinancialStats(tenantId, userRole, range);
  }

  // Delegation helpers for anti-spam & email notifications
  get MIN_NOTIFICATION_INTERVAL_MS() {
    return this.notifService.MIN_NOTIFICATION_INTERVAL_MS;
  }

  isEligibleForEmailNotification(lastSentAt: Date | string | null | undefined, now = new Date()): boolean {
    return this.notifService.isEligibleForEmailNotification(lastSentAt, now);
  }

  async processDueInvoiceEmailNotification(invoice: Invoice, now = new Date()): Promise<boolean> {
    return this.notifService.processDueInvoiceEmailNotification(invoice, now);
  }

  async checkAndSendDueInvoiceNotifications(now = new Date()): Promise<number> {
    return this.notifService.checkAndSendDueInvoiceNotifications(now);
  }
}

export const invoiceService = new InvoiceService();
