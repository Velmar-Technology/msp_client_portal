import { useState, useEffect, useCallback, useMemo } from 'react';
import { rmmService, type RmmPatchItem } from '@/services/rmmService';
import { toast } from 'sonner';
import axios from 'axios';

export interface UsePatchManagementModalParams {
  open: boolean;
  equipmentId: string | null;
  onPatchesUpdated?: () => void;
}

export interface UsePatchManagementModalReturn {
  patches: RmmPatchItem[];
  loading: boolean;
  applying: boolean;
  selectedPatchIds: string[];
  pendingPatches: RmmPatchItem[];
  isAllPendingSelected: boolean;
  selectedCount: number;
  handleTogglePatch: (id: string, checked: boolean) => void;
  handleSelectAllPending: (checked: boolean) => void;
  handleApplySelected: () => Promise<void>;
  fetchPatches: () => Promise<void>;
}

export const usePatchManagementModal = ({
  open,
  equipmentId,
  onPatchesUpdated,
}: UsePatchManagementModalParams): UsePatchManagementModalReturn => {
  const [patches, setPatches] = useState<RmmPatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [selectedPatchIds, setSelectedPatchIds] = useState<string[]>([]);

  const fetchPatches = useCallback(async () => {
    if (!equipmentId) return;
    try {
      setLoading(true);
      const data = await rmmService.getEquipmentPatches(equipmentId);
      setPatches(data);
      const pendingIds = data.filter((p) => p.status === 'PENDING').map((p) => p.id);
      setSelectedPatchIds(pendingIds);
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to load device patch inventory';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    if (open && equipmentId) {
      fetchPatches();
    }
  }, [open, equipmentId, fetchPatches]);

  const pendingPatches = useMemo(() => {
    return patches.filter((p) => p.status === 'PENDING');
  }, [patches]);

  const isAllPendingSelected = useMemo(() => {
    return pendingPatches.length > 0 && selectedPatchIds.length === pendingPatches.length;
  }, [pendingPatches, selectedPatchIds]);

  const handleTogglePatch = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedPatchIds((prev) => [...prev, id]);
    } else {
      setSelectedPatchIds((prev) => prev.filter((pId) => pId !== id));
    }
  }, []);

  const handleSelectAllPending = useCallback(
    (checked: boolean) => {
      if (checked) {
        const pendingIds = pendingPatches.map((p) => p.id);
        setSelectedPatchIds(pendingIds);
      } else {
        setSelectedPatchIds([]);
      }
    },
    [pendingPatches]
  );

  const handleApplySelected = useCallback(async () => {
    if (!equipmentId || selectedPatchIds.length === 0) return;
    try {
      setApplying(true);
      toast.info(`Triggering Zabbix patch update for ${selectedPatchIds.length} package(s)...`);
      await rmmService.applyPatches(equipmentId, selectedPatchIds);
      toast.success('Security patches installed successfully via Zabbix agent!');
      await fetchPatches();
      if (onPatchesUpdated) {
        onPatchesUpdated();
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to apply security patches';
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  }, [equipmentId, selectedPatchIds, fetchPatches, onPatchesUpdated]);

  return {
    patches,
    loading,
    applying,
    selectedPatchIds,
    pendingPatches,
    isAllPendingSelected,
    selectedCount: selectedPatchIds.length,
    handleTogglePatch,
    handleSelectAllPending,
    handleApplySelected,
    fetchPatches,
  };
};
