import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from './subscriptionService';
import { planService, type PlanFilters } from './planService';
import type { CreateSubscriptionInput, CreatePaypalOrderInput } from '@shared/contracts';

/**
 * Standardized query keys for subscriptions and plans per ADR-002.
 */
export const SUBSCRIPTION_QUERY_KEYS = {
  all: ['subscriptions'] as const,
  lists: () => [...SUBSCRIPTION_QUERY_KEYS.all, 'list'] as const,
  features: () => [...SUBSCRIPTION_QUERY_KEYS.all, 'features'] as const,
  plans: (filters?: PlanFilters) => ['plans', filters] as const,
};

/**
 * Fetches all subscriptions for the active tenant.
 */
export function useSubscriptions() {
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.lists(),
    queryFn: () => subscriptionService.getAll(),
  });
}

/**
 * Fetches active or expiring subscriptions for the current tenant.
 */
export function useActiveSubscriptions() {
  return useQuery({
    queryKey: [...SUBSCRIPTION_QUERY_KEYS.lists(), 'active'],
    queryFn: async () => {
      const subs = await subscriptionService.getAll();
      return subs.filter((s) => s.status === 'ACTIVE' || s.status === 'EXPIRING');
    },
  });
}

/**
 * Fetches available service plans with optional role-based filtering.
 *
 * @param filters - Optional search, pagination, and clientType criteria.
 */
export function usePlans(filters?: PlanFilters) {
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.plans(filters),
    queryFn: () => planService.getAll(filters),
  });
}

/**
 * Mutation to provision a new client subscription.
 * Automatically invalidates subscription query cache on success.
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionInput) => subscriptionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.all });
    },
  });
}

/**
 * Mutation to create a one-time PayPal order for subscription purchase.
 */
export function useCreatePaypalOrder() {
  return useMutation({
    mutationFn: (data: CreatePaypalOrderInput) => subscriptionService.createPaypalOrder(data),
  });
}

/**
 * Mutation to initiate a recurring PayPal subscription.
 */
export function useCreatePaypalSubscription() {
  return useMutation({
    mutationFn: (data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual' }) =>
      subscriptionService.createPaypalSubscription(data),
  });
}
