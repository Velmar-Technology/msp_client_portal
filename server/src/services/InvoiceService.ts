import { invoiceRepository, InvoiceRepository } from '../repositories/InvoiceRepository';
import { subscriptionRepository, SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { expenseRepository, ExpenseRepository } from '../repositories/ExpenseRepository';
import { AppError } from '../utils/AppError';
import { Invoice, UserRole, InvoiceStatus, SubscriptionStatus } from '../types';
import { paypalService } from './PaypalService';
import { logger } from '../utils/logger';
import { invoicePdfService, InvoicePdfService } from './InvoicePdfService';
import { invoiceNotificationService, InvoiceNotificationService } from './InvoiceNotificationService';
import { invoiceAccessPolicy, InvoiceAccessPolicy } from '../policies/InvoiceAccessPolicy';

export class InvoiceService {
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private expenseRepo: ExpenseRepository = expenseRepository,
    private pdfService: InvoicePdfService = invoicePdfService,
    private notifService: InvoiceNotificationService = invoiceNotificationService,
    private accessPolicy: InvoiceAccessPolicy = invoiceAccessPolicy,
  ) {}

  private async activateExpiredSubscriptionsForClient(clientId: string, tenantId: string): Promise<void> {
    try {
      const clientSubs = await this.subscriptionRepo.findByClient(clientId, tenantId);
      for (const sub of clientSubs) {
        if (sub.status === SubscriptionStatus.EXPIRED) {
          await this.subscriptionRepo.updateStatus(sub.id, SubscriptionStatus.ACTIVE);
        }
      }
    } catch (err) {
      logger.error('Failed to activate expired subscriptions for client:', err);
    }
  }

  async getClientInvoices(tenantId: string, userRole: UserRole, page = 1, limit = 20): Promise<{ invoices: (Invoice & { line_items?: Array<{ description: string; quantity: number; unit_price: number }> })[]; total: number }> {
    const offset = (page - 1) * limit;
    const isAdmin = userRole === UserRole.ADMIN;
    
    const rawInvoices = isAdmin
      ? await this.invoiceRepo.findAll(limit, offset)
      : await this.invoiceRepo.findByTenant(tenantId, limit, offset);

    const total = isAdmin
      ? await this.invoiceRepo.count()
      : await this.invoiceRepo.countByTenant(tenantId);

    const enriched = await Promise.all(rawInvoices.map((inv) => this.enrichInvoiceWithLineItems(inv)));
    return { invoices: enriched, total };
  }

  private async enrichInvoiceWithLineItems(inv: Invoice): Promise<Invoice & { line_items?: Array<{ description: string; quantity: number; unit_price: number }> }> {
    try {
      const subs = await this.subscriptionRepo.findByClient(inv.client_id, inv.tenant_id);
      const invCreatedAt = new Date(inv.created_at || inv.invoice_date).getTime();
      let bestMatch = subs[0];
      let bestDiff = Infinity;
      for (const sub of subs) {
        const subCreatedAt = new Date(sub.created_at || '').getTime();
        const diff = Math.abs(subCreatedAt - invCreatedAt);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = sub;
        }
      }
      if (bestMatch) {
        return {
          ...inv,
          line_items: [{
            description: bestMatch.service_name,
            quantity: bestMatch.equipment_count || 1,
            unit_price: Number(inv.amount) / (bestMatch.equipment_count || 1),
          }],
        };
      }
    } catch (err) {
      logger.warn(`Could not enrich invoice ${inv.id} line items`, { err });
    }
    return inv;
  }

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    this.accessPolicy.assertAccess(invoice, tenantId, userRole);
    return invoice;
  }

  async createPaypalOrder(id: string, tenantId: string, userRole: UserRole): Promise<{ orderId: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    if (invoice.status === InvoiceStatus.PAID) {
      throw AppError.badRequest('Invoice is already paid');
    }
    const order = await paypalService.createOrder(invoice);
    return { orderId: order.id };
  }

  async capturePaypalOrder(id: string, paypalOrderId: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const captureResult = await paypalService.captureOrder(paypalOrderId);
    if (captureResult.status !== 'COMPLETED') {
      throw AppError.badRequest('PayPal payment was not completed');
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    await this.activateExpiredSubscriptionsForClient(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyPaymentReceived(invoice);

    return updatedInvoice;
  }

  async markAsPaid(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    this.accessPolicy.assertAdmin(userRole, 'Only administrators can mark invoices as paid manually');

    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    await this.activateExpiredSubscriptionsForClient(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyManualPaymentConfirmed(invoice);

    return updatedInvoice;
  }

  async cancelInvoice(id: string, tenantId: string, userRole: UserRole, userId: string, reason?: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);

    if (invoice.status === InvoiceStatus.PAID) {
      throw AppError.badRequest('Cannot cancel an already paid invoice');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, InvoiceStatus.CANCELLED);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    await this.cancelRelatedSubscriptionIfExpired(invoice);
    await this.notifService.notifyInvoiceCancelled(invoice, userId, userRole, reason);

    return updatedInvoice;
  }

  private async cancelRelatedSubscriptionIfExpired(invoice: Invoice): Promise<void> {
    try {
      const clientSubs = await this.subscriptionRepo.findByClient(invoice.client_id, invoice.tenant_id);
      const invCreatedAt = new Date(invoice.created_at || invoice.invoice_date).getTime();
      let bestMatch = clientSubs[0];
      let bestDiff = Infinity;
      for (const sub of clientSubs) {
        if (sub.status !== SubscriptionStatus.EXPIRED) continue;
        const subCreatedAt = new Date(sub.created_at || '').getTime();
        const diff = Math.abs(subCreatedAt - invCreatedAt);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = sub;
        }
      }
      if (bestMatch && bestMatch.status === SubscriptionStatus.EXPIRED) {
        await this.subscriptionRepo.updateStatus(bestMatch.id, SubscriptionStatus.CANCELLED);
      }
    } catch (err) {
      logger.error('Failed to cancel related subscription for cancelled invoice:', err);
    }
  }

  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    return this.pdfService.generatePdf(invoice, lang);
  }

  async getFinancialStats(tenantId: string, userRole: UserRole, range: '30_days' | 'quarter' | 'year') {
    const isClient = userRole === UserRole.CLIENT;
    const allInvoices = await this.invoiceRepo.getAllForStats(isClient ? tenantId : undefined);
    const referenceDate = allInvoices.length > 0 ? new Date(allInvoices[0].invoice_date) : new Date();

    let rangeMs = 30 * 24 * 60 * 60 * 1000;
    if (range === 'quarter') rangeMs = 90 * 24 * 60 * 60 * 1000;
    else if (range === 'year') rangeMs = 365 * 24 * 60 * 60 * 1000;

    const currentPeriodStart = new Date(referenceDate.getTime() - rangeMs);
    const previousPeriodStart = new Date(referenceDate.getTime() - 2 * rangeMs);

    let currentRevenue = 0;
    let previousRevenue = 0;

    for (const inv of allInvoices) {
      const invDate = new Date(inv.invoice_date);
      if (inv.status === InvoiceStatus.PAID) {
        if (invDate >= currentPeriodStart && invDate <= referenceDate) {
          currentRevenue += Number(inv.total);
        } else if (invDate >= previousPeriodStart && invDate < currentPeriodStart) {
          previousRevenue += Number(inv.total);
        }
      }
    }

    const activeSubs = await this.subscriptionRepo.getActiveSubscriptionsWithPlan(isClient ? tenantId : undefined);
    let currentMRR = 0;
    let previousMRR = 0;

    for (const sub of activeSubs) {
      const price = Number(sub.price) || 0;
      const count = sub.equipmentCount || 1;
      const subMRR = price * count;
      currentMRR += subMRR;

      const createdAt = new Date(sub.created_at);
      if (createdAt < currentPeriodStart) {
        previousMRR += subMRR;
      }
    }

    const dbExpenses = await this.expenseRepo.getAllForStats(isClient ? tenantId : undefined);
    let currentExpenses = 0;
    let previousExpenses = 0;

    for (const exp of dbExpenses) {
      const expDate = new Date(exp.expense_date);
      if (expDate >= currentPeriodStart && expDate <= referenceDate) {
        currentExpenses += Number(exp.amount);
      } else if (expDate >= previousPeriodStart && expDate < currentPeriodStart) {
        previousExpenses += Number(exp.amount);
      }
    }

    const currentMargin = currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue) * 100 : 0;
    const previousMargin = previousRevenue > 0 ? ((previousRevenue - previousExpenses) / previousRevenue) * 100 : 0;

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return { trend: '+0.0%', isPositive: true };
      const diff = ((curr - prev) / prev) * 100;
      const sign = diff >= 0 ? '+' : '';
      return { trend: `${sign}${diff.toFixed(1)}%`, isPositive: diff >= 0 };
    };

    const revTrend = calculateTrend(currentRevenue, previousRevenue);
    const mrrTrend = calculateTrend(currentMRR, previousMRR);
    const expDiff = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const expTrend = { trend: `${expDiff >= 0 ? '+' : ''}${expDiff.toFixed(1)}%`, isPositive: expDiff <= 0 };
    const marginDiff = currentMargin - previousMargin;
    const marginTrend = { trend: `${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)}%`, isPositive: marginDiff >= 0 };

    const kpis = [
      { key: 'revenue', titleKey: 'revenue', value: `$${currentRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: revTrend.trend, isPositiveTrend: revTrend.isPositive },
      { key: 'mrr', titleKey: 'mrr', value: `$${currentMRR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: mrrTrend.trend, isPositiveTrend: mrrTrend.isPositive },
      { key: 'expenses', titleKey: 'expenses', value: `$${currentExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: expTrend.trend, isPositiveTrend: expTrend.isPositive },
      { key: 'margin', titleKey: 'margin', value: `${currentMargin.toFixed(1)}%`, trend: marginTrend.trend, isPositiveTrend: marginTrend.isPositive },
    ];

    const monthlyData: any[] = [];
    const shortMonthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    for (let i = 11; i >= 0; i--) {
      const targetMonthDate = new Date(refYear, refMonth - i, 1);
      const year = targetMonthDate.getFullYear();
      const monthIdx = targetMonthDate.getMonth();
      const monthLabel = shortMonthNames[monthIdx];

      let monthRevenue = 0;
      for (const inv of allInvoices) {
        if (inv.status === InvoiceStatus.PAID) {
          const invDate = new Date(inv.invoice_date);
          if (invDate.getFullYear() === year && invDate.getMonth() === monthIdx) {
            monthRevenue += Number(inv.total);
          }
        }
      }

      let monthExpenses = 0;
      for (const exp of dbExpenses) {
        const expDate = new Date(exp.expense_date);
        if (expDate.getFullYear() === year && expDate.getMonth() === monthIdx) {
          monthExpenses += Number(exp.amount);
        }
      }

      monthlyData.push({ month: monthLabel, revenue: monthRevenue, expenses: monthExpenses });
    }

    const categoriesSum: Record<string, number> = { cloudInfra: 0, salaries: 0, marketing: 0, officeSpace: 0, other: 0 };
    for (const exp of dbExpenses) {
      const expDate = new Date(exp.expense_date);
      if (expDate >= currentPeriodStart && expDate <= referenceDate) {
        const cat = exp.category;
        if (categoriesSum[cat] !== undefined) categoriesSum[cat] += Number(exp.amount);
        else categoriesSum.other += Number(exp.amount);
      }
    }

    const totalExpVal = Object.values(categoriesSum).reduce((a, b) => a + b, 0);
    const expenseCategories = [
      { nameKey: 'cloudInfra', value: categoriesSum.cloudInfra, percentage: totalExpVal > 0 ? Math.round((categoriesSum.cloudInfra / totalExpVal) * 100) : 0, color: '#10b981' },
      { nameKey: 'salaries', value: categoriesSum.salaries, percentage: totalExpVal > 0 ? Math.round((categoriesSum.salaries / totalExpVal) * 100) : 0, color: '#71717a' },
      { nameKey: 'marketing', value: categoriesSum.marketing, percentage: totalExpVal > 0 ? Math.round((categoriesSum.marketing / totalExpVal) * 100) : 0, color: '#f59e0b' },
      { nameKey: 'officeSpace', value: categoriesSum.officeSpace, percentage: totalExpVal > 0 ? Math.round((categoriesSum.officeSpace / totalExpVal) * 100) : 0, color: '#6366f1' },
      { nameKey: 'other', value: categoriesSum.other, percentage: totalExpVal > 0 ? Math.round((categoriesSum.other / totalExpVal) * 100) : 0, color: '#ec4899' },
    ].filter(cat => cat.value > 0);

    const rangeInvoices = allInvoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= currentPeriodStart && invDate <= referenceDate;
    });

    const txns: any[] = rangeInvoices.map(inv => ({
      id: inv.id,
      date: new Date(inv.invoice_date).toISOString().split('T')[0],
      description: `Invoice ${inv.invoice_number}`,
      categoryKey: 'revenue',
      status: inv.status === InvoiceStatus.PAID ? 'PAID' : 'PENDING',
      amount: Number(inv.total),
    }));

    const rangeExpenses = dbExpenses.filter(exp => {
      const expDate = new Date(exp.expense_date);
      return expDate >= currentPeriodStart && expDate <= referenceDate;
    });

    txns.push(...rangeExpenses.map(exp => ({
      id: exp.id,
      date: new Date(exp.expense_date).toISOString().split('T')[0],
      description: exp.description,
      categoryKey: exp.category,
      status: 'PAID',
      amount: -Number(exp.amount),
      expense_identifier: exp.expense_identifier,
    })));

    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { kpis, monthlyData, expenseCategories, transactions: txns };
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
