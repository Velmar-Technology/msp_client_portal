import api from './api';

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
};
