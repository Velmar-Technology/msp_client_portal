import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rmmService } from "./rmmService";
import {
  maintenanceService,
  type CreateMaintenancePayload,
  type UpdateMaintenancePayload,
  type MaintenanceFilterParams,
} from "./maintenanceService";

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for RMM & Maintenance domain.
 */
export const RMM_QUERY_KEYS = {
  all: ["rmm"] as const,
  overview: () => [...RMM_QUERY_KEYS.all, "overview"] as const,
  patches: (equipmentId: string) => [...RMM_QUERY_KEYS.all, "patches", equipmentId] as const,
  maintenances: (params?: MaintenanceFilterParams) => [...RMM_QUERY_KEYS.all, "maintenances", params] as const,
  maintenance: (id: string) => [...RMM_QUERY_KEYS.all, "maintenance", id] as const,
};

export function useRmmOverview() {
  return useQuery({
    queryKey: RMM_QUERY_KEYS.overview(),
    queryFn: () => rmmService.getOverview(),
  });
}

export function useEquipmentPatches(equipmentId?: string | null) {
  return useQuery({
    queryKey: RMM_QUERY_KEYS.patches(equipmentId ?? ""),
    queryFn: () => rmmService.getEquipmentPatches(equipmentId!),
    enabled: Boolean(equipmentId),
  });
}

export function useTriggerScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (equipmentId: string) => rmmService.triggerScan(equipmentId),
    onSuccess: (_, equipmentId) => {
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.patches(equipmentId) });
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.overview() });
    },
  });
}

export function useApplyPatches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, patchIds }: { equipmentId: string; patchIds: string[] }) =>
      rmmService.applyPatches(equipmentId, patchIds),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.patches(vars.equipmentId) });
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.overview() });
    },
  });
}

export function useMaintenances(params?: MaintenanceFilterParams) {
  return useQuery({
    queryKey: RMM_QUERY_KEYS.maintenances(params),
    queryFn: () => maintenanceService.getMaintenances(params),
  });
}

export function useMaintenanceDetail(id?: string | null) {
  return useQuery({
    queryKey: RMM_QUERY_KEYS.maintenance(id ?? ""),
    queryFn: () => maintenanceService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMaintenancePayload) => maintenanceService.createMaintenance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.all });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMaintenancePayload }) =>
      maintenanceService.updateMaintenance(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.maintenances() });
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.maintenance(vars.id) });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceService.deleteMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RMM_QUERY_KEYS.all });
    },
  });
}
