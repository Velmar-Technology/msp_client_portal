import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions';
import { ExpenseRepository, expenseRepository } from '@modules/billing/repositories/ExpenseRepository';
import { InvoiceStatus, UserRole } from '@shared/types';

export type FinancialRange = '30_days' | 'quarter' | 'year';

export interface FinancialKpi {
  key: string;
  titleKey: string;
  value: string;
  trend: string;
  isPositiveTrend: boolean;
}

export interface MonthlyChartPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ExpenseCategoryBreakdown {
  nameKey: string;
  value: number;
  percentage: number;
  color: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  categoryKey: string;
  status: string;
  amount: number;
  expense_identifier?: string;
}

export interface FinancialStatsResult {
  kpis: FinancialKpi[];
  monthlyData: MonthlyChartPoint[];
  expenseCategories: ExpenseCategoryBreakdown[];
  transactions: FinancialTransaction[];
}

/**
 * Domain service calculating executive financial KPIs, MRR, operating margins, expense category shares, and chart data points.
 */
export class FinancialStatsService {
  /**
   * Initializes FinancialStatsService with invoice, subscription, and expense repository dependencies.
   *
   * @param invoiceRepo - Invoice repository
   * @param subscriptionRepo - Subscription repository
   * @param expenseRepo - Operational expenses repository
   */
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private expenseRepo: ExpenseRepository = expenseRepository
  ) {}

  private get invoiceRepository(): InvoiceRepository {
    return this.invoiceRepo || invoiceRepository;
  }

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get expenseRepository(): ExpenseRepository {
    return this.expenseRepo || expenseRepository;
  }

  private getRangeMilliseconds(range: FinancialRange): number {
    switch (range) {
      case 'quarter':
        return 90 * 24 * 60 * 60 * 1000;
      case 'year':
        return 365 * 24 * 60 * 60 * 1000;
      case '30_days':
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private calculateTrend(current: number, previous: number): { trend: string; isPositive: boolean } {
    if (previous === 0) return { trend: '+0.0%', isPositive: true };
    const diff = ((current - previous) / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return { trend: `${sign}${diff.toFixed(1)}%`, isPositive: diff >= 0 };
  }

  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private calculateRevenue(invoices: any[], startDate: Date, endDate: Date): number {
    let revenue = 0;
    for (const inv of invoices) {
      if (inv.status === InvoiceStatus.PAID) {
        const invDate = new Date(inv.invoice_date);
        if (invDate >= startDate && invDate <= endDate) {
          revenue += Number(inv.total);
        }
      }
    }
    return revenue;
  }

  private calculateMrr(activeSubs: any[], periodStart: Date): { currentMrr: number; previousMrr: number } {
    let currentMrr = 0;
    let previousMrr = 0;
    for (const sub of activeSubs) {
      const price = Number(sub.price) || 0;
      const count = sub.equipmentCount || 1;
      const subMrr = price * count;
      currentMrr += subMrr;
      if (new Date(sub.created_at) < periodStart) {
        previousMrr += subMrr;
      }
    }
    return { currentMrr, previousMrr };
  }

  private calculateExpenses(expenses: any[], startDate: Date, endDate: Date): number {
    let total = 0;
    for (const exp of expenses) {
      const expDate = new Date(exp.expense_date);
      if (expDate >= startDate && expDate <= endDate) {
        total += Number(exp.amount);
      }
    }
    return total;
  }

  private buildMonthlyData(allInvoices: any[], allExpenses: any[], referenceDate: Date): MonthlyChartPoint[] {
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    const monthlyData: MonthlyChartPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(refYear, refMonth - i, 1);
      const year = targetDate.getFullYear();
      const monthIdx = targetDate.getMonth();
      const monthLabel = monthNames[monthIdx];

      let monthRev = 0;
      for (const inv of allInvoices) {
        if (inv.status === InvoiceStatus.PAID) {
          const d = new Date(inv.invoice_date);
          if (d.getFullYear() === year && d.getMonth() === monthIdx) {
            monthRev += Number(inv.total);
          }
        }
      }

      let monthExp = 0;
      for (const exp of allExpenses) {
        const d = new Date(exp.expense_date);
        if (d.getFullYear() === year && d.getMonth() === monthIdx) {
          monthExp += Number(exp.amount);
        }
      }

      monthlyData.push({ month: monthLabel, revenue: monthRev, expenses: monthExp });
    }
    return monthlyData;
  }

  private buildExpenseCategories(expenses: any[], startDate: Date, endDate: Date): ExpenseCategoryBreakdown[] {
    const categoriesSum: Record<string, number> = { cloudInfra: 0, salaries: 0, marketing: 0, officeSpace: 0, other: 0 };
    for (const exp of expenses) {
      const d = new Date(exp.expense_date);
      if (d >= startDate && d <= endDate) {
        const cat = exp.category;
        if (categoriesSum[cat] !== undefined) categoriesSum[cat] += Number(exp.amount);
        else categoriesSum.other += Number(exp.amount);
      }
    }

    const totalExpVal = Object.values(categoriesSum).reduce((a, b) => a + b, 0);
    const colorMap: Record<string, string> = {
      cloudInfra: '#10b981',
      salaries: '#71717a',
      marketing: '#f59e0b',
      officeSpace: '#6366f1',
      other: '#ec4899',
    };

    return Object.entries(categoriesSum)
      .map(([nameKey, value]) => ({
        nameKey,
        value,
        percentage: totalExpVal > 0 ? Math.round((value / totalExpVal) * 100) : 0,
        color: colorMap[nameKey] || '#9ca3af',
      }))
      .filter((cat) => cat.value > 0);
  }

  private buildTransactionList(invoices: any[], expenses: any[], startDate: Date, endDate: Date): FinancialTransaction[] {
    const txns: FinancialTransaction[] = [];

    const rangeInvoices = invoices.filter((inv) => {
      const d = new Date(inv.invoice_date);
      return d >= startDate && d <= endDate;
    });

    for (const inv of rangeInvoices) {
      txns.push({
        id: inv.id,
        date: new Date(inv.invoice_date).toISOString().split('T')[0],
        description: `Invoice ${inv.invoice_number}`,
        categoryKey: 'revenue',
        status: inv.status === InvoiceStatus.PAID ? 'PAID' : 'PENDING',
        amount: Number(inv.total),
      });
    }

    const rangeExpenses = expenses.filter((exp) => {
      const d = new Date(exp.expense_date);
      return d >= startDate && d <= endDate;
    });

    for (const exp of rangeExpenses) {
      txns.push({
        id: exp.id,
        date: new Date(exp.expense_date).toISOString().split('T')[0],
        description: exp.description,
        categoryKey: exp.category,
        status: 'PAID',
        amount: -Number(exp.amount),
        expense_identifier: exp.expense_identifier,
      });
    }

    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return txns;
  }

  /**
   * Computes high-level financial KPIs (Revenue, MRR, Expenses, Margin), monthly historical trends,
   * category cost allocation, and transaction logs.
   *
   * @param tenantId - Calling user tenant UUID
   * @param userRole - Calling user role
   * @param range - Time horizon ('30_days', 'quarter', 'year')
   * @returns FinancialStatsResult containing KPIs, graphs, breakdowns, and recent transactions
   */
  async getFinancialStats(tenantId: string, userRole: UserRole, range: FinancialRange): Promise<FinancialStatsResult> {
    const isClient = userRole === UserRole.CLIENT;
    const tenantFilter = isClient ? tenantId : undefined;

    const allInvoices = await this.invoiceRepository.getAllForStats(tenantFilter);
    const activeSubs = await this.subRepo.getActiveSubscriptionsWithPlan(tenantFilter);
    const allExpenses = await this.expenseRepository.getAllForStats(tenantFilter);

    const referenceDate = allInvoices.length > 0 ? new Date(allInvoices[0].invoice_date) : new Date();
    const rangeMs = this.getRangeMilliseconds(range);

    const currentPeriodStart = new Date(referenceDate.getTime() - rangeMs);
    const previousPeriodStart = new Date(referenceDate.getTime() - 2 * rangeMs);

    const currentRevenue = this.calculateRevenue(allInvoices, currentPeriodStart, referenceDate);
    const previousRevenue = this.calculateRevenue(allInvoices, previousPeriodStart, currentPeriodStart);

    const { currentMrr, previousMrr } = this.calculateMrr(activeSubs, currentPeriodStart);

    const currentExpenses = this.calculateExpenses(allExpenses, currentPeriodStart, referenceDate);
    const previousExpenses = this.calculateExpenses(allExpenses, previousPeriodStart, currentPeriodStart);

    const currentMargin = currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue) * 100 : 0;
    const previousMargin = previousRevenue > 0 ? ((previousRevenue - previousExpenses) / previousRevenue) * 100 : 0;

    const revTrend = this.calculateTrend(currentRevenue, previousRevenue);
    const mrrTrend = this.calculateTrend(currentMrr, previousMrr);

    const expDiff = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const expTrend = { trend: `${expDiff >= 0 ? '+' : ''}${expDiff.toFixed(1)}%`, isPositive: expDiff <= 0 };

    const marginDiff = currentMargin - previousMargin;
    const marginTrend = { trend: `${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)}%`, isPositive: marginDiff >= 0 };

    const kpis: FinancialKpi[] = [
      { key: 'revenue', titleKey: 'revenue', value: this.formatCurrency(currentRevenue), trend: revTrend.trend, isPositiveTrend: revTrend.isPositive },
      { key: 'mrr', titleKey: 'mrr', value: this.formatCurrency(currentMrr), trend: mrrTrend.trend, isPositiveTrend: mrrTrend.isPositive },
      { key: 'expenses', titleKey: 'expenses', value: this.formatCurrency(currentExpenses), trend: expTrend.trend, isPositiveTrend: expTrend.isPositive },
      { key: 'margin', titleKey: 'margin', value: `${currentMargin.toFixed(1)}%`, trend: marginTrend.trend, isPositiveTrend: marginTrend.isPositive },
    ];

    const monthlyData = this.buildMonthlyData(allInvoices, allExpenses, referenceDate);
    const expenseCategories = this.buildExpenseCategories(allExpenses, currentPeriodStart, referenceDate);
    const transactions = this.buildTransactionList(allInvoices, allExpenses, currentPeriodStart, referenceDate);

    return { kpis, monthlyData, expenseCategories, transactions };
  }
}

export const financialStatsService = new FinancialStatsService();
