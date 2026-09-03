import { describe, it, expect } from 'vitest';
import {
  InvoiceQuerySchema,
  CapturePaypalOrderSchema,
  CancelInvoiceSchema,
  InvoiceIdParamSchema,
  FinancialStatsQuerySchema,
  CreateExpenseInputSchema,
  ExpenseQuerySchema,
  ExpenseIdParamSchema,
  InvoiceResponseSchema,
  InvoiceStatus,
  ExpenseCategory,
  ExpenseResponseSchema,
  FinancialStatsResponseSchema,
} from './billing.contract';

describe('Billing Contracts', () => {
  describe('InvoiceQuerySchema', () => {
    it('validates a valid payload with defaults', () => {
      const result = InvoiceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('coerces string numbers for page and limit', () => {
      const result = InvoiceQuerySchema.safeParse({ page: '2', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });

    it('rejects non-positive page', () => {
      const result = InvoiceQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects limit exceeding 100', () => {
      const result = InvoiceQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });
  });

  describe('CapturePaypalOrderSchema', () => {
    it('accepts a valid orderId', () => {
      const result = CapturePaypalOrderSchema.safeParse({ orderId: 'PAY-1234567890' });
      expect(result.success).toBe(true);
    });

    it('rejects empty orderId', () => {
      const result = CapturePaypalOrderSchema.safeParse({ orderId: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing orderId', () => {
      const result = CapturePaypalOrderSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('CancelInvoiceSchema', () => {
    it('accepts empty body (optional reason)', () => {
      const result = CancelInvoiceSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts a valid reason', () => {
      const result = CancelInvoiceSchema.safeParse({ reason: 'Client requested cancellation' });
      expect(result.success).toBe(true);
    });

    it('rejects reason exceeding 500 characters', () => {
      const result = CancelInvoiceSchema.safeParse({ reason: 'x'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('InvoiceIdParamSchema', () => {
    it('accepts a valid UUID', () => {
      const result = InvoiceIdParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid UUID', () => {
      const result = InvoiceIdParamSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('FinancialStatsQuerySchema', () => {
    it('defaults to 30_days', () => {
      const result = FinancialStatsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.range).toBe('30_days');
      }
    });

    it('accepts valid range values', () => {
      for (const range of ['30_days', 'quarter', 'year'] as const) {
        const result = FinancialStatsQuerySchema.safeParse({ range });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid range', () => {
      const result = FinancialStatsQuerySchema.safeParse({ range: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateExpenseInputSchema', () => {
    it('validates a valid expense with all fields', () => {
      const result = CreateExpenseInputSchema.safeParse({
        amount: 250.00,
        description: 'Monthly cloud hosting fees',
        category: ExpenseCategory.CLOUD_INFRA,
        expense_date: '2026-09-01T00:00:00.000Z',
        tenantId: '11111111-1111-1111-1111-111111111111',
        expense_identifier: 'EXP-001',
      });
      expect(result.success).toBe(true);
    });

    it('validates with only required fields', () => {
      const result = CreateExpenseInputSchema.safeParse({
        amount: 100,
        description: 'Office supplies',
        category: ExpenseCategory.OTHER,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-positive amount', () => {
      const result = CreateExpenseInputSchema.safeParse({
        amount: -50,
        description: 'Invalid amount',
        category: ExpenseCategory.OTHER,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty description', () => {
      const result = CreateExpenseInputSchema.safeParse({
        amount: 100,
        description: '',
        category: ExpenseCategory.OTHER,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = CreateExpenseInputSchema.safeParse({
        amount: 100,
        description: 'Test',
        category: 'invalidCategory',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ExpenseQuerySchema', () => {
    it('validates a valid payload with defaults', () => {
      const result = ExpenseQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('coerces string numbers', () => {
      const result = ExpenseQuerySchema.safeParse({ page: '3', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });
  });

  describe('ExpenseIdParamSchema', () => {
    it('accepts a valid UUID', () => {
      const result = ExpenseIdParamSchema.safeParse({ id: '22222222-2222-2222-2222-222222222222' });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid UUID', () => {
      const result = ExpenseIdParamSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('InvoiceResponseSchema', () => {
    it('validates a complete invoice response', () => {
      const invoice = {
        id: '11111111-1111-1111-1111-111111111111',
        invoice_number: 'INV-2026-001',
        client_id: '22222222-2222-2222-2222-222222222222',
        amount: 100,
        tax_amount: 18,
        total: 118,
        currency: 'USD',
        ncf: 'B0100000001',
        rnc: '123456789',
        status: InvoiceStatus.PENDING,
        invoice_date: '2026-09-01',
        due_date: '2026-09-15',
        created_at: new Date().toISOString(),
        line_items: [
          { description: 'Monthly Service', quantity: 1, unit_price: 100 },
        ],
      };

      const result = InvoiceResponseSchema.safeParse(invoice);
      expect(result.success).toBe(true);
    });

    it('validates invoice without optional fields', () => {
      const invoice = {
        id: '11111111-1111-1111-1111-111111111111',
        invoice_number: 'INV-2026-002',
        client_id: '22222222-2222-2222-2222-222222222222',
        amount: 250,
        tax_amount: 45,
        total: 295,
        status: InvoiceStatus.PAID,
        invoice_date: '2026-08-01',
        due_date: '2026-08-15',
        created_at: new Date().toISOString(),
      };

      const result = InvoiceResponseSchema.safeParse(invoice);
      expect(result.success).toBe(true);
    });
  });

  describe('ExpenseResponseSchema', () => {
    it('validates a complete expense response', () => {
      const expense = {
        id: '33333333-3333-3333-3333-333333333333',
        amount: 150.50,
        description: 'AWS monthly hosting',
        category: ExpenseCategory.CLOUD_INFRA,
        expense_date: '2026-09-01',
        tenant_id: '44444444-4444-4444-4444-444444444444',
        created_at: new Date().toISOString(),
      };

      const result = ExpenseResponseSchema.safeParse(expense);
      expect(result.success).toBe(true);
    });
  });

  describe('FinancialStatsResponseSchema', () => {
    it('validates a complete financial stats response', () => {
      const stats = {
        kpis: [
          { key: 'revenue', titleKey: 'Revenue', value: '$10,000', trend: '+12%', isPositiveTrend: true },
        ],
        monthlyData: [
          { month: 'Jan', revenue: 5000, expenses: 2000 },
        ],
        expenseCategories: [
          { nameKey: 'Cloud', value: 1200, percentage: 40, color: '#3b82f6' },
        ],
        transactions: [
          { id: '1', date: '2026-09-01', description: 'Invoice payment', categoryKey: 'revenue', status: 'PAID', amount: 500 },
        ],
      };

      const result = FinancialStatsResponseSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });
  });
});
