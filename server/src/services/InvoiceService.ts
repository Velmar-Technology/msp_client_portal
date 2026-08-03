import { invoiceRepository } from '../repositories/InvoiceRepository';
import { userRepository } from '../repositories/UserRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { expenseRepository } from '../repositories/ExpenseRepository';
import { AppError } from '../utils/AppError';
import { Invoice, UserRole, InvoiceStatus } from '../types';
import { paypalService } from './PaypalService';
import { notificationService } from './NotificationService';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { logger } from '../utils/logger';

export class InvoiceService {
  async getClientInvoices(tenantId: string, userRole: UserRole, page = 1, limit = 20): Promise<{ invoices: Invoice[]; total: number }> {
    const offset = (page - 1) * limit;
    if (userRole === UserRole.ADMIN) {
      const invoices = await invoiceRepository.findAll(limit, offset);
      const total = await invoiceRepository.count();
      return { invoices, total };
    } else {
      const invoices = await invoiceRepository.findByTenant(tenantId, limit, offset);
      const total = await invoiceRepository.countByTenant(tenantId);
      return { invoices, total };
    }
  }

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw AppError.forbidden('Access denied');
    }
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

    const updatedInvoice = await invoiceRepository.updateStatus(id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    // Trigger in-app notification to client
    await notificationService.createInAppNotification({
      userId: invoice.client_id,
      title: 'Payment Received',
      message: `Your payment of $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number} has been processed successfully.`,
      link: '/billing',
      type: 'INVOICE_PAID',
      tenantId: invoice.tenant_id,
    });

    // Trigger in-app notification to all Admin users
    try {
      const adminUsers = await userRepository.findByRole(UserRole.ADMIN);
      const clientUser = await userRepository.findById(invoice.client_id);
      const clientName = clientUser?.name || 'A customer';
      for (const admin of adminUsers) {
        await notificationService.createInAppNotification({
          userId: admin.id,
          title: 'Invoice Payment Received',
          message: `${clientName} paid $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number}.`,
          link: '/billing',
          type: 'INVOICE_PAID_ADMIN',
          tenantId: invoice.tenant_id,
        });
      }
    } catch (err) {
      logger.error('Failed to notify admin of payment success:', err);
    }

    return updatedInvoice;
  }

  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);

    const client = await userRepository.findById(invoice.client_id);
    if (!client) throw AppError.notFound('Client not found');

    const tenant = await tenantRepository.findById(invoice.tenant_id);
    if (!tenant) throw AppError.notFound('Tenant not found');

    const finalLang = lang || client.language || 'en_US';

    const pdfBuffer = generateInvoicePdf(
      invoice,
      client.name,
      client.email,
      tenant.name,
      finalLang
    );

    return {
      pdfBuffer,
      invoiceNumber: invoice.invoice_number,
    };
  }

  async getFinancialStats(tenantId: string, userRole: UserRole, range: '30_days' | 'quarter' | 'year') {
    const isClient = userRole === UserRole.CLIENT;
    const allInvoices = await invoiceRepository.getAllForStats(isClient ? tenantId : undefined);

    const referenceDate = allInvoices.length > 0 ? new Date(allInvoices[0].invoice_date) : new Date();

    let rangeMs = 30 * 24 * 60 * 60 * 1000;
    if (range === 'quarter') {
      rangeMs = 90 * 24 * 60 * 60 * 1000;
    } else if (range === 'year') {
      rangeMs = 365 * 24 * 60 * 60 * 1000;
    }

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

    const activeSubs = await subscriptionRepository.getActiveSubscriptionsWithPlan(isClient ? tenantId : undefined);

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

    const dbExpenses = await expenseRepository.getAllForStats(isClient ? tenantId : undefined);

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
      return {
        trend: `${sign}${diff.toFixed(1)}%`,
        isPositive: diff >= 0,
      };
    };

    const revTrend = calculateTrend(currentRevenue, previousRevenue);
    const mrrTrend = calculateTrend(currentMRR, previousMRR);
    const expDiff = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const expTrend = {
      trend: `${expDiff >= 0 ? '+' : ''}${expDiff.toFixed(1)}%`,
      isPositive: expDiff <= 0,
    };
    const marginDiff = currentMargin - previousMargin;
    const marginTrend = {
      trend: `${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)}%`,
      isPositive: marginDiff >= 0,
    };

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

      monthlyData.push({
        month: monthLabel,
        revenue: monthRevenue,
        expenses: monthExpenses,
      });
    }

    const categoriesSum: Record<string, number> = {
      cloudInfra: 0,
      salaries: 0,
      marketing: 0,
      officeSpace: 0,
      other: 0,
    };

    for (const exp of dbExpenses) {
      const expDate = new Date(exp.expense_date);
      if (expDate >= currentPeriodStart && expDate <= referenceDate) {
        const cat = exp.category;
        if (categoriesSum[cat] !== undefined) {
          categoriesSum[cat] += Number(exp.amount);
        } else {
          categoriesSum.other += Number(exp.amount);
        }
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

    return {
      kpis,
      monthlyData,
      expenseCategories,
      transactions: txns,
    };
  }
}

export const invoiceService = new InvoiceService();

