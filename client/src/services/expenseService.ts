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

/**
 * Operating expense management service for financial tracking.
 */
export const expenseService = {
  /**
   * Retrieves a paginated list of recorded operational expenses.
   *
   * @param page - Page number (1-based).
   * @param limit - Page size limit.
   * @returns Promise resolving to expense list and pagination metadata.
   */
  async getAll(page = 1, limit = 10): Promise<{ data: Expense[]; pagination: { total: number; totalPages: number } }> {
    const response = await api.get('/expenses', { params: { page, limit } });
    return response.data;
  },

  /**
   * Creates a new operational expense entry.
   *
   * @param data - Expense details (amount, description, category, expense_date, tenantId, expense_identifier).
   * @returns Promise resolving to created Expense entity.
   */
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

  /**
   * Deletes an operational expense record.
   *
   * @param id - Expense UUID.
   * @returns Promise resolving to deletion confirmation.
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};
