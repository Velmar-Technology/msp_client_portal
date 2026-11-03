import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consumablesService } from './consumablesService';
import type {
  CreateConsumableInput,
  UpdateConsumableInput,
  CheckoutConsumableInput,
  RestockConsumableInput,
} from '@shared/contracts';

/**
 * Canonical query keys for Consumables sub-module caching.
 */
export const consumablesKeys = {
  all: ['consumables'] as const,
  lists: () => [...consumablesKeys.all, 'list'] as const,
  list: (search?: string) => [...consumablesKeys.lists(), search] as const,
  details: () => [...consumablesKeys.all, 'detail'] as const,
  detail: (id: string) => [...consumablesKeys.details(), id] as const,
  checkouts: (id: string) => [...consumablesKeys.all, 'checkouts', id] as const,
};

/**
 * Hook to retrieve filtered list of consumables.
 */
export function useConsumablesQuery(search?: string) {
  return useQuery({
    queryKey: consumablesKeys.list(search),
    queryFn: () => consumablesService.getConsumables(search),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve a single consumable by ID.
 */
export function useConsumableDetailQuery(id: string) {
  return useQuery({
    queryKey: consumablesKeys.detail(id),
    queryFn: () => consumablesService.getConsumableById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to retrieve consumable checkouts ledger.
 */
export function useConsumableCheckoutsQuery(id: string) {
  return useQuery({
    queryKey: consumablesKeys.checkouts(id),
    queryFn: () => consumablesService.getConsumableCheckouts(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new consumable.
 */
export function useCreateConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsumableInput) => consumablesService.createConsumable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consumablesKeys.all });
    },
  });
}

/**
 * Hook to update an existing consumable.
 */
export function useUpdateConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateConsumableInput }) =>
      consumablesService.updateConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: consumablesKeys.all });
      queryClient.invalidateQueries({ queryKey: consumablesKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to delete a consumable.
 */
export function useDeleteConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => consumablesService.deleteConsumable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consumablesKeys.all });
    },
  });
}

/**
 * Hook to checkout / dispense consumable stock.
 */
export function useCheckoutConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CheckoutConsumableInput }) =>
      consumablesService.checkoutConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: consumablesKeys.all });
      queryClient.invalidateQueries({ queryKey: consumablesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: consumablesKeys.checkouts(variables.id) });
    },
  });
}

/**
 * Hook to restock consumable inventory.
 */
export function useRestockConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RestockConsumableInput }) =>
      consumablesService.restockConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: consumablesKeys.all });
      queryClient.invalidateQueries({ queryKey: consumablesKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: consumablesKeys.checkouts(variables.id) });
    },
  });
}
