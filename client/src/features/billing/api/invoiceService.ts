import api from "@/services/api";
import type {
  InvoiceContract,
  InvoiceLineItemContract,
  FinancialStatsResponseContract as FinancialStats,
} from "@shared/contracts";

export type { InvoiceLineItemContract };
export type Invoice = InvoiceContract;
export type InvoiceLineItemType = InvoiceLineItemContract;
export type FinancialStatsResponse = FinancialStats;

/**
 * Billing and invoice service.
 * Handles invoice generation, PayPal order creation & capture, PDF downloads, and financial reporting.
 */
export const invoiceService = {
  /**
   * Retrieves a paginated list of billing invoices.
   *
   * @param page - Page number (1-based).
   * @param limit - Page size.
   * @returns Promise resolving to invoice list and pagination metadata.
   */
  async getAll(page = 1, limit = 10): Promise<{ data: Invoice[]; pagination: { total: number; totalPages: number } }> {
    const response = await api.get('/invoices', { params: { page, limit } });
    return response.data;
  },

  /**
   * Retrieves detailed invoice information by unique ID.
   *
   * @param id - Invoice UUID.
   * @returns Promise resolving to Invoice entity.
   * @throws {NotFoundError} If invoice does not exist.
   */
  async getById(id: string): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`);
    return response.data.data;
  },

  /**
   * Generates a PayPal order for an outstanding invoice.
   *
   * @param id - Invoice UUID.
   * @returns Promise resolving to PayPal order identifier.
   */
  async createPaypalOrder(id: string): Promise<{ orderId: string }> {
    const response = await api.post(`/invoices/${id}/create-paypal-order`);
    return response.data.data;
  },

  /**
   * Captures an approved PayPal order and marks the invoice as paid.
   * Also reactivates any associated expired client subscriptions.
   *
   * @see BL-401 (Subscription Reactivation)
   * @param id - Invoice UUID.
   * @param orderId - PayPal Order ID.
   * @returns Promise resolving to updated invoice result.
   */
  async capturePaypalOrder(id: string, orderId: string): Promise<{ success: boolean; data: Invoice }> {
    const response = await api.post(`/invoices/${id}/capture-paypal-order`, { orderId });
    return response.data;
  },

  /**
   * Admin: Manually marks an invoice as paid (e.g. bank transfer or wire verification).
   *
   * @see BL-401 (Subscription Reactivation)
   * @param id - Invoice UUID.
   * @returns Promise resolving to updated invoice result.
   */
  async markAsPaid(id: string): Promise<{ success: boolean; data: Invoice }> {
    const response = await api.patch(`/invoices/${id}/mark-paid`);
    return response.data;
  },

  /**
   * Downloads a PDF receipt/invoice document.
   *
   * @param id - Invoice UUID.
   * @param lang - Optional locale code for translated PDF content.
   * @returns Promise resolving to binary PDF Blob.
   */
  async downloadInvoice(id: string, lang?: string): Promise<Blob> {
    const response = await api.get(`/invoices/${id}/download`, {
      params: lang ? { lang } : {},
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Fetches aggregate financial analytics and KPI summaries.
   *
   * @param range - Timeframe ('30_days' | 'quarter' | 'year').
   * @returns Promise resolving to KPIs, monthly revenue/expenses, and transaction breakdowns.
   */
  async getFinancialStats(range: "30_days" | "quarter" | "year" = "30_days"): Promise<FinancialStats> {
    const response = await api.get('/invoices/financial-stats', { params: { range } });
    return response.data.data;
  },

  /**
   * Cancels a pending invoice with an optional cancellation reason.
   *
   * @param id - Invoice UUID.
   * @param reason - Reason for cancellation.
   * @returns Promise resolving to updated invoice result.
   */
  async cancelInvoice(id: string, reason?: string): Promise<{ success: boolean; data: Invoice }> {
    const response = await api.patch(`/invoices/${id}/cancel`, { reason });
    return response.data;
  },
};
