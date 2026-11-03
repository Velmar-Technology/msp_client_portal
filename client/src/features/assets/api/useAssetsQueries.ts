import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsService } from './assetsService';
import type {
  CreateAssetInput,
  UpdateAssetInput,
  AssetFilterQuery,
  CreateConsumableInput,
  UpdateConsumableInput,
  CheckoutConsumableInput,
  RestockConsumableInput,
} from '@shared/contracts';

/**
 * Canonical query keys for Assets module caching.
 */
export const assetsKeys = {
  all: ['assets'] as const,
  lists: () => [...assetsKeys.all, 'list'] as const,
  list: (filters?: AssetFilterQuery) => [...assetsKeys.lists(), filters] as const,
  details: () => [...assetsKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetsKeys.details(), id] as const,

  // Consumables keys
  consumablesAll: ['consumables'] as const,
  consumablesList: (search?: string) => [...assetsKeys.consumablesAll, 'list', search] as const,
  consumableDetail: (id: string) => [...assetsKeys.consumablesAll, 'detail', id] as const,
  consumableCheckouts: (id: string) => [...assetsKeys.consumablesAll, 'checkouts', id] as const,
};

/**
 * Hook to retrieve filtered list of IT assets.
 */
export function useAssetsQuery(filters?: AssetFilterQuery) {
  return useQuery({
    queryKey: assetsKeys.list(filters),
    queryFn: () => assetsService.getAssets(filters),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve a single asset by ID.
 */
export function useAssetDetailQuery(id: string) {
  return useQuery({
    queryKey: assetsKeys.detail(id),
    queryFn: () => assetsService.getAssetById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new asset with automatic cache invalidation.
 */
export function useCreateAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetInput) => assetsService.createAsset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
  });
}

/**
 * Hook to update an existing asset.
 */
export function useUpdateAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetInput }) =>
      assetsService.updateAsset(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
      queryClient.invalidateQueries({ queryKey: assetsKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to delete an asset.
 */
export function useDeleteAssetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
  });
}

/**
 * Hook to retrieve filtered list of consumables.
 */
export function useConsumablesQuery(search?: string) {
  return useQuery({
    queryKey: assetsKeys.consumablesList(search),
    queryFn: () => assetsService.getConsumables(search),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve a single consumable by ID.
 */
export function useConsumableDetailQuery(id: string) {
  return useQuery({
    queryKey: assetsKeys.consumableDetail(id),
    queryFn: () => assetsService.getConsumableById(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to retrieve consumable checkouts ledger.
 */
export function useConsumableCheckoutsQuery(id: string) {
  return useQuery({
    queryKey: assetsKeys.consumableCheckouts(id),
    queryFn: () => assetsService.getConsumableCheckouts(id),
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new consumable.
 */
export function useCreateConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsumableInput) => assetsService.createConsumable(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumablesAll });
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
      assetsService.updateConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumablesAll });
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumableDetail(variables.id) });
    },
  });
}

/**
 * Hook to delete a consumable.
 */
export function useDeleteConsumableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsService.deleteConsumable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumablesAll });
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
      assetsService.checkoutConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumablesAll });
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumableDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumableCheckouts(variables.id) });
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
      assetsService.restockConsumable(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumablesAll });
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumableDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assetsKeys.consumableCheckouts(variables.id) });
    },
  });
}
