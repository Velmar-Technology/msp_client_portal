import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  expenseService,
  type CreateExpensePayload,
} from "./expenseService";
import {
  earningsService,
  type TechnicianRate,
} from "./earningsService";

export const FINANCIAL_QUERY_KEYS = {
  all: ["financial"] as const,
  expenses: (page?: number, limit?: number) => [...FINANCIAL_QUERY_KEYS.all, "expenses", { page, limit }] as const,
  myEarnings: (page?: number, limit?: number) => [...FINANCIAL_QUERY_KEYS.all, "my-earnings", { page, limit }] as const,
  adminEarnings: (params?: { status?: string; page?: number; limit?: number }) =>
    [...FINANCIAL_QUERY_KEYS.all, "admin-earnings", params] as const,
};

export function useExpenses(page = 1, limit = 10) {
  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.expenses(page, limit),
    queryFn: () => expenseService.getAll(page, limit),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpensePayload) => expenseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
  });
}

export function useMyEarnings(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.myEarnings(params?.page, params?.limit),
    queryFn: () => earningsService.getMyEarnings(params),
  });
}

export function useAdminEarnings(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.adminEarnings(params),
    queryFn: () => earningsService.getAdminOverview(params),
  });
}

export function useBatchPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (earningIds: string[]) => earningsService.processBatchPayout(earningIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
  });
}

export function useRecalculateCommissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => earningsService.recalculateCommissions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTechnicianRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TechnicianRate>) => earningsService.updateRates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
  });
}
