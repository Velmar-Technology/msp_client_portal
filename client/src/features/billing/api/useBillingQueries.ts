import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "./invoiceService";
import { expenseService } from "@/features/financial";
import type { CreateExpenseInput, InvoiceQueryInput } from "@shared/contracts";

export const BILLING_QUERY_KEYS = {
  all: ["billing"] as const,
  invoices: () => [...BILLING_QUERY_KEYS.all, "invoices"] as const,
  invoiceList: (params: InvoiceQueryInput) => [...BILLING_QUERY_KEYS.invoices(), "list", params] as const,
  invoiceDetail: (id: string) => [...BILLING_QUERY_KEYS.invoices(), "detail", id] as const,
  expenses: () => [...BILLING_QUERY_KEYS.all, "expenses"] as const,
  expenseList: (params: InvoiceQueryInput) => [...BILLING_QUERY_KEYS.expenses(), "list", params] as const,
  expenseDetail: (id: string) => [...BILLING_QUERY_KEYS.expenses(), "detail", id] as const,
  stats: () => [...BILLING_QUERY_KEYS.all, "stats"] as const,
};

/**
 * Query hook for the paginated list of billing invoices.
 * Maps the raw API response into normalized list data for consistent table rendering.
 *
 * @param params - Pagination parameters (page, limit).
 * @returns Query result with invoices, total, page, limit, and totalPages.
 */
export function useInvoices(params: InvoiceQueryInput) {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.invoiceList(params),
    queryFn: async () => {
      const response = await invoiceService.getAll(params.page, params.limit);
      return {
        invoices: response.data || [],
        total: response.pagination?.total ?? 0,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        totalPages: response.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Query hook for fetching a single invoice by its UUID.
 *
 * @param id - Invoice UUID.
 * @returns Query result with the invoice entity.
 */
export function useInvoice(id?: string) {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.invoiceDetail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Invoice ID required");
      return await invoiceService.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Query hook for the paginated list of operational expenses.
 *
 * @param params - Pagination parameters (page, limit).
 * @returns Query result with expenses, total, page, limit, and totalPages.
 */
export function useExpenses(params: InvoiceQueryInput) {
  return useQuery({
    queryKey: BILLING_QUERY_KEYS.expenseList(params),
    queryFn: async () => {
      const response = await expenseService.getAll(params.page, params.limit);
      return {
        expenses: response.data || [],
        total: response.pagination?.total ?? 0,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        totalPages: response.pagination?.totalPages ?? 1,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Query hook for financial dashboard stats (KPIs, monthly trends, expense categories, transactions).
 *
 * @param range - Timeframe ('30_days' | 'quarter' | 'year').
 * @returns Query result with the financial stats dataset.
 */
export function useFinancialStats(range: "30_days" | "quarter" | "year" = "30_days") {
  return useQuery({
    queryKey: [...BILLING_QUERY_KEYS.stats(), range],
    queryFn: async () => {
      return await invoiceService.getFinancialStats(range);
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Mutation hook to create a PayPal order and capture it for an outstanding invoice.
 * Automatically invalidates billing cache upon successful settlement.
 *
 * @see BL-401 (Subscription Reactivation)
 * @returns Mutation for capturing a PayPal order.
 */
export function useCapturePaypalOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orderId }: { id: string; orderId: string }) => {
      return await invoiceService.capturePaypalOrder(id, orderId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoiceDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation hook for an administrator to manually mark an invoice as paid
 * (e.g. wire transfer verification).
 *
 * @see BL-401 (Subscription Reactivation)
 * @returns Mutation for marking an invoice paid.
 */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await invoiceService.markAsPaid(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoiceDetail(id) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation hook to cancel a pending invoice with an optional reason.
 * Automatically invalidates billing cache upon success.
 *
 * @returns Mutation for cancelling an invoice.
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return await invoiceService.cancelInvoice(id, reason);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.invoiceDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation hook to create a new business expense (Admin only).
 * Automatically invalidates the expense list and financial stats cache.
 *
 * @returns Mutation for creating an expense.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      return await expenseService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.expenses() });
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEYS.stats() });
    },
  });
}
