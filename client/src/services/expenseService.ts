import api from "@/services/api";

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'cloudInfra' | 'salaries' | 'marketing' | 'officeSpace' | 'other';
  expense_date: string;
  tenant_id: string;
  expense_identifier?: string | null;
  created_at: string;
}

export const expenseService = {
  async getAll(page = 1, limit = 20): Promise<{ data: Expense[]; pagination: { total: number; totalPages: number } }> {
    const response = await api.get('/expenses', { params: { page, limit } });
    return response.data;
  },

  async create(data: {
    amount: number;
    description: string;
    category: string;
    expense_date?: string;
    tenantId?: string;
    expense_identifier?: string | null;
  }): Promise<Expense> {
    const response = await api.post('/expenses', data);
    return response.data.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};
