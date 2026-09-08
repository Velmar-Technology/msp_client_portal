import { z } from 'zod';

// ============================================
// Canonical Billing Enums
// ============================================

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ExpenseCategory {
  CLOUD_INFRA = 'cloudInfra',
  SALARIES = 'salaries',
  MARKETING = 'marketing',
  OFFICE_SPACE = 'officeSpace',
  OTHER = 'other',
}

export type Currency = 'USD' | 'DOP';

// ============================================
// Zod Enums for Validation
// ============================================

export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus, {
  errorMap: () => ({
    message: 'Status must be PENDING, PAID, OVERDUE, or CANCELLED',
  }),
});

export const ExpenseCategorySchema = z.nativeEnum(ExpenseCategory, {
  errorMap: () => ({
    message: 'Category must be cloudInfra, salaries, marketing, officeSpace, or other',
  }),
});

export const CurrencySchema = z.enum(['USD', 'DOP'], {
  errorMap: () => ({
    message: 'Currency must be USD or DOP',
  }),
});

// ============================================
// Input Request Contracts
// ============================================

export const InvoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type InvoiceQueryInput = z.infer<typeof InvoiceQuerySchema>;

export const CapturePaypalOrderSchema = z.object({
  orderId: z.string().min(1, 'PayPal Order ID is required'),
});

export type CapturePaypalOrderInput = z.infer<typeof CapturePaypalOrderSchema>;

export const CancelInvoiceSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export type CancelInvoiceInput = z.infer<typeof CancelInvoiceSchema>;

export const InvoiceIdParamSchema = z.object({
  id: z.string().uuid('Invoice ID is invalid'),
});

export type InvoiceIdParam = z.infer<typeof InvoiceIdParamSchema>;

export const FinancialStatsQuerySchema = z.object({
  range: z.enum(['30_days', 'quarter', 'year'], {
    errorMap: () => ({
      message: 'Range must be 30_days, quarter, or year',
    }),
  }).optional().default('30_days'),
});

export type FinancialStatsQueryInput = z.infer<typeof FinancialStatsQuerySchema>;

export const CreateExpenseInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description cannot exceed 1000 characters'),
  category: ExpenseCategorySchema,
  expense_date: z.string().datetime({ message: 'Invalid date format' }).optional(),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
  expense_identifier: z.string().max(100).optional().nullable(),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseInputSchema>;

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type ExpenseQueryInput = z.infer<typeof ExpenseQuerySchema>;

export const ExpenseIdParamSchema = z.object({
  id: z.string().uuid('Expense ID is invalid'),
});

export type ExpenseIdParam = z.infer<typeof ExpenseIdParamSchema>;

// ============================================
// Entity Response Contracts
// ============================================

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
});

export type InvoiceLineItemContract = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string(),
  client_id: z.string().uuid(),
  amount: z.number(),
  tax_amount: z.number(),
  total: z.number(),
  currency: CurrencySchema.optional(),
  ncf: z.string().nullable().optional(),
  rnc: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'], {
    errorMap: () => ({
      message: 'Status must be PENDING, PAID, OVERDUE, or CANCELLED',
    }),
  }),
  invoice_date: z.string(),
  due_date: z.string(),
  created_at: z.string(),
  line_items: z.array(InvoiceLineItemSchema).optional(),
});

export type InvoiceContract = z.infer<typeof InvoiceResponseSchema>;

export const InvoiceListResponseSchema = z.object({
  invoices: z.array(InvoiceResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type InvoiceListResponseContract = z.infer<typeof InvoiceListResponseSchema>;

export const ExpenseResponseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  description: z.string(),
  category: ExpenseCategorySchema,
  expense_date: z.string(),
  tenant_id: z.string().uuid(),
  expense_identifier: z.string().nullable().optional(),
  created_at: z.string(),
});

export type ExpenseContract = z.infer<typeof ExpenseResponseSchema>;

export const ExpenseListResponseSchema = z.object({
  expenses: z.array(ExpenseResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type ExpenseListResponseContract = z.infer<typeof ExpenseListResponseSchema>;

export const FinancialStatsResponseSchema = z.object({
  kpis: z.array(z.object({
    key: z.string(),
    titleKey: z.string(),
    value: z.string(),
    trend: z.string(),
    isPositiveTrend: z.boolean(),
  })),
  monthlyData: z.array(z.object({
    month: z.string(),
    revenue: z.number(),
    expenses: z.number(),
  })),
  expenseCategories: z.array(z.object({
    nameKey: z.string(),
    value: z.number(),
    percentage: z.number(),
    color: z.string(),
  })),
  transactions: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    categoryKey: z.string(),
    status: z.enum(['PAID', 'PENDING', 'FAILED']),
    amount: z.number(),
  })),
});

export type FinancialStatsResponseContract = z.infer<typeof FinancialStatsResponseSchema>;

// ============================================
// BL-702 Non-Payment Vault Grace Contracts
// ============================================

export const RequestVaultGraceInputSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RequestVaultGraceInput = z.infer<typeof RequestVaultGraceInputSchema>;

export const VaultGraceStatusResponseSchema = z.object({
  granted: z.boolean(),
  graceUntil: z.string().nullable(),
  extensionsCount: z.number(),
  maxExtensions: z.number(),
  message: z.string(),
});

export type VaultGraceStatusResponseContract = z.infer<typeof VaultGraceStatusResponseSchema>;
