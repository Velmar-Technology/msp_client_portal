import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialStatsService } from './FinancialStatsService';
import { UserRole, InvoiceStatus, SubscriptionStatus } from '@shared/types';

describe('FinancialStatsService', () => {
  let statsService: FinancialStatsService;
  let mockInvoiceRepo: any;
  let mockSubscriptionRepo: any;
  let mockExpenseRepo: any;

  beforeEach(() => {
    mockInvoiceRepo = {
      getAllForStats: vi.fn(),
    };
    mockSubscriptionRepo = {
      getActiveSubscriptionsWithPlan: vi.fn(),
    };
    mockExpenseRepo = {
      getAllForStats: vi.fn(),
    };

    statsService = new FinancialStatsService(
      mockInvoiceRepo,
      mockSubscriptionRepo,
      mockExpenseRepo
    );
  });

  it('should aggregate revenue, MRR, expenses, margin and trends correctly', async () => {
    const refDate = new Date('2026-07-01T12:00:00Z');
    const invoices = [
      { id: 'inv-1', invoice_number: '1', client_id: 'c1', amount: 100, tax_amount: 18, total: 118, status: InvoiceStatus.PAID, invoice_date: refDate },
      { id: 'inv-2', invoice_number: '2', client_id: 'c1', amount: 50, tax_amount: 9, total: 59, status: InvoiceStatus.PAID, invoice_date: refDate },
    ];
    mockInvoiceRepo.getAllForStats.mockResolvedValue(invoices);

    const activeSubs = [
      { id: 'sub-1', planId: 'PL-001', equipmentCount: 2, status: SubscriptionStatus.ACTIVE, created_at: refDate, price: 30, hasPaidRevenue: true },
    ];
    mockSubscriptionRepo.getActiveSubscriptionsWithPlan.mockResolvedValue(activeSubs);

    const mockExpenses = [
      { id: 'exp-1', amount: 100.00, description: 'Cloud server', category: 'cloudInfra', expense_date: refDate, tenant_id: 'tenant-1' },
    ];
    mockExpenseRepo.getAllForStats.mockResolvedValue(mockExpenses);

    const result = await statsService.getFinancialStats('tenant-1', UserRole.CLIENT, '30_days');

    expect(mockInvoiceRepo.getAllForStats).toHaveBeenCalledWith('tenant-1');
    expect(mockSubscriptionRepo.getActiveSubscriptionsWithPlan).toHaveBeenCalledWith('tenant-1');
    expect(mockExpenseRepo.getAllForStats).toHaveBeenCalledWith('tenant-1');

    const revKpi = result.kpis.find(k => k.key === 'revenue');
    const mrrKpi = result.kpis.find(k => k.key === 'mrr');
    const expKpi = result.kpis.find(k => k.key === 'expenses');

    expect(revKpi?.value).toBe('$177.00');
    expect(mrrKpi?.value).toBe('$60.00');
    expect(expKpi?.value).toBe('$100.00');
    expect(result.monthlyData.length).toBe(12);
    expect(result.expenseCategories.length).toBeGreaterThan(0);
    expect(result.transactions.length).toBe(3);
  });

  /**
   * BL-703 Regression: Complimentary subscriptions must NEVER contribute to MRR.
   * A subscription with `hasPaidRevenue = false` (no genuine PAID invoice with total > 0)
   * must be excluded from the MRR KPI regardless of the plan's catalog price.
   * @see BL-703
   */
  it('BL-703: excludes complimentary subscriptions from MRR calculation', async () => {
    const refDate = new Date('2026-09-12T05:00:00Z');
    // Zero-value PAID invoice — what a voided complimentary plan looks like after sentinel:op invoice:void
    const invoices = [
      { id: 'inv-void', invoice_number: 'INV-2026-446273', client_id: 'c1', amount: 190.80, tax_amount: 0, total: 0, status: InvoiceStatus.PAID, invoice_date: refDate },
    ];
    mockInvoiceRepo.getAllForStats.mockResolvedValue(invoices);

    // Subscription is ACTIVE on PL-001 ($18/mo) but hasPaidRevenue = false
    // because the only invoice had total = 0 (complimentary 100% discount).
    const activeSubs = [
      { id: 'sub-complimentary', planId: 'PL-001', equipmentCount: 1, status: SubscriptionStatus.ACTIVE, created_at: refDate, price: 18, hasPaidRevenue: false },
    ];
    mockSubscriptionRepo.getActiveSubscriptionsWithPlan.mockResolvedValue(activeSubs);
    mockExpenseRepo.getAllForStats.mockResolvedValue([]);

    const result = await statsService.getFinancialStats('tenant-complimentary', UserRole.CLIENT, '30_days');

    const mrrKpi = result.kpis.find(k => k.key === 'mrr');
    const revKpi = result.kpis.find(k => k.key === 'revenue');

    // MRR must be $0 — complimentary subs contribute nothing
    expect(mrrKpi?.value).toBe('$0.00');
    // Revenue also $0 — no genuine paid cash
    expect(revKpi?.value).toBe('$0.00');
  });
});
