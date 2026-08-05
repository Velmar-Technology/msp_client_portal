import api from "@/services/api";

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  tax_amount: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  invoice_date: string;
  due_date: string;
  created_at: string;
}

export const invoiceService = {
  async getAll(page = 1, limit = 20): Promise<{ data: Invoice[]; pagination: { total: number; totalPages: number } }> {
    const response = await api.get('/invoices', { params: { page, limit } });
    return response.data;
  },

  async getById(id: string): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`);
    return response.data.data;
  },

  async createPaypalOrder(id: string): Promise<{ orderId: string }> {
    const response = await api.post(`/invoices/${id}/create-paypal-order`);
    return response.data.data;
  },

  async capturePaypalOrder(id: string, orderId: string): Promise<{ success: boolean; data: Invoice }> {
    const response = await api.post(`/invoices/${id}/capture-paypal-order`, { orderId });
    return response.data;
  },

  async markAsPaid(id: string): Promise<{ success: boolean; data: Invoice }> {
    const response = await api.patch(`/invoices/${id}/mark-paid`);
    return response.data;
  },

  async downloadInvoice(id: string, lang?: string): Promise<Blob> {
    const response = await api.get(`/invoices/${id}/download`, {
      params: lang ? { lang } : {},
      responseType: 'blob'
    });
    return response.data;
  },

  async getFinancialStats(range: '30_days' | 'quarter' | 'year'): Promise<{
    kpis: Array<{ key: string; titleKey: string; value: string; trend: string; isPositiveTrend: boolean }>;
    monthlyData: Array<{ month: string; revenue: number; expenses: number }>;
    expenseCategories: Array<{ nameKey: string; value: number; percentage: number; color: string }>;
    transactions: Array<{ id: string; date: string; description: string; categoryKey: string; status: 'PAID' | 'PENDING' | 'FAILED'; amount: number }>;
  }> {
    const response = await api.get('/invoices/financial-stats', { params: { range } });
    return response.data.data;
  },
};

