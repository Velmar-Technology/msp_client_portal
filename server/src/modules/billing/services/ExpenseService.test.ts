import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findByTenant: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    countByTenant: vi.fn(),
    create: vi.fn(),
    deleteById: vi.fn(),
  };
});

vi.mock('@modules/billing/repositories/ExpenseRepository', () => {
  return {
    expenseRepository: {
      findById: mocks.findById,
      findByTenant: mocks.findByTenant,
      findAll: mocks.findAll,
      count: mocks.count,
      countByTenant: mocks.countByTenant,
      create: mocks.create,
      deleteById: mocks.deleteById,
    },
  };
});

import { expenseService } from './ExpenseService';
import { UserRole, Expense } from '@shared/types';

describe('ExpenseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockExpense: Expense = {
    id: 'exp-1',
    amount: 150.00,
    description: 'Cloud hosting',
    category: 'cloudInfra',
    expense_date: new Date(),
    tenant_id: 'tenant-1',
    created_at: new Date(),
  };

  describe('getExpenses', () => {
    it('should return all expenses for Admin role', async () => {
      mocks.findAll.mockResolvedValue([mockExpense]);
      mocks.count.mockResolvedValue(1);

      const result = await expenseService.getExpenses('tenant-1', UserRole.ADMIN, 1, 20);

      expect(mocks.findAll).toHaveBeenCalledWith(20, 0);
      expect(mocks.count).toHaveBeenCalled();
      expect(result).toEqual({ expenses: [mockExpense], total: 1 });
    });

    it('should return tenant specific expenses for Client role', async () => {
      mocks.findByTenant.mockResolvedValue([mockExpense]);
      mocks.countByTenant.mockResolvedValue(1);

      const result = await expenseService.getExpenses('tenant-1', UserRole.CLIENT, 1, 20);

      expect(mocks.findByTenant).toHaveBeenCalledWith('tenant-1', 20, 0);
      expect(mocks.countByTenant).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ expenses: [mockExpense], total: 1 });
    });
  });

  describe('createExpense', () => {
    it('should allow admin to create expense', async () => {
      mocks.create.mockResolvedValue(mockExpense);

      const result = await expenseService.createExpense({
        amount: 150.00,
        description: 'Cloud hosting',
        category: 'cloudInfra',
        expense_date: mockExpense.expense_date,
        tenant_id: 'tenant-1',
      }, UserRole.ADMIN);

      expect(mocks.create).toHaveBeenCalledWith({
        amount: 150.00,
        description: 'Cloud hosting',
        category: 'cloudInfra',
        expense_date: mockExpense.expense_date,
        tenant_id: 'tenant-1',
      });
      expect(result).toEqual(mockExpense);
    });

    it('should throw forbidden error for client role', async () => {
      await expect(
        expenseService.createExpense({
          amount: 150.00,
          description: 'Cloud hosting',
          category: 'cloudInfra',
          expense_date: mockExpense.expense_date,
          tenant_id: 'tenant-1',
        }, UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only administrators can log expenses',
      });
    });
  });

  describe('deleteExpense', () => {
    it('should allow admin to delete expense', async () => {
      mocks.findById.mockResolvedValue(mockExpense);
      mocks.deleteById.mockResolvedValue(true);

      const result = await expenseService.deleteExpense('exp-1', 'tenant-1', UserRole.ADMIN);

      expect(mocks.deleteById).toHaveBeenCalledWith('exp-1');
      expect(result).toBe(true);
    });

    it('should throw forbidden for client role trying to delete', async () => {
      await expect(
        expenseService.deleteExpense('exp-1', 'tenant-1', UserRole.CLIENT)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Only administrators can delete expenses',
      });
    });
  });
});
