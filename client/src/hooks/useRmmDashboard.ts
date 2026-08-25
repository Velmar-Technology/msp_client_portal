import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { rmmService, type RmmOverviewStats } from '@/services/rmmService';
import { equipmentService, type SubscriptionEquipment } from '@/services/equipmentService';
import type { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

import { RMM_TELEMETRY_POLL_INTERVAL_MS } from "@/constants/ui";
export { RMM_TELEMETRY_POLL_INTERVAL_MS };


export interface SelectedDevice {
  id: string;
  name: string;
}

export interface UseRmmDashboardReturn {
  stats: RmmOverviewStats | null;
  devices: SubscriptionEquipment[];
  filteredDevices: SubscriptionEquipment[];
  paginatedDevices: SubscriptionEquipment[];
  loading: boolean;
  scanningMap: Record<string, boolean>;
  selectedDevice: SelectedDevice | null;
  patchModalOpen: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  totalPages: number;
  selectedDevices: SubscriptionEquipment[];
  setSelectedDevices: (devices: SubscriptionEquipment[]) => void;
  fetchData: () => Promise<void>;
  handleScanDevice: (equipmentId: string) => Promise<void>;
  handleBulkScan: (selectedList: SubscriptionEquipment[]) => Promise<void>;
  handleBulkExportCSV: (selectedList: SubscriptionEquipment[]) => void;
  handleOpenPatchModal: (equipmentId: string, deviceName: string) => void;
  setPatchModalOpen: (open: boolean) => void;
}

export const useRmmDashboard = (): UseRmmDashboardReturn => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<RmmOverviewStats | null>(null);
  const [devices, setDevices] = useState<SubscriptionEquipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanningMap, setScanningMap] = useState<Record<string, boolean>>({});
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null);
  const [patchModalOpen, setPatchModalOpen] = useState<boolean>(false);

  // Search, Filter, Sort & Pagination State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'device_name', desc: false }]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [selectedDevices, setSelectedDevices] = useState<SubscriptionEquipment[]>([]);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [overviewData, devicesData] = await Promise.all([
        rmmService.getOverview(),
        equipmentService.getMyDevices(),
      ]);
      setStats(overviewData);
      setDevices((prev) => {
        const prevMap = new Map(prev.map((d) => [d.id, d]));
        return devicesData.map((d) => {
          const existing = prevMap.get(d.id);
          return {
            ...d,
            agent_status: d.agent_status ?? existing?.agent_status ?? (d.status === 'ACTIVE' ? 'ONLINE' : null),
            cpu_usage: d.cpu_usage ?? existing?.cpu_usage,
            memory_usage: d.memory_usage ?? existing?.memory_usage,
            disk_usage: d.disk_usage ?? existing?.disk_usage,
            disk_used_gb: d.disk_used_gb ?? existing?.disk_used_gb,
            disk_total_gb: d.disk_total_gb ?? existing?.disk_total_gb,
            pending_patch_count: d.pending_patch_count ?? existing?.pending_patch_count,
            last_sync_at: d.last_sync_at ?? existing?.last_sync_at,
          };
        });
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('rmm.toastLoadError');
      if (!isSilent) toast.error(message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();

    // Real-Time Telemetry Auto-Polling
    const intervalId = setInterval(() => {
      fetchData(true);
    }, RMM_TELEMETRY_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  // 1. Filtering
  const filteredDevices = useMemo(() => {
    return devices.filter((dev) => {
      const name = (dev.device_name || `Slot #${dev.slot_index + 1}`).toLowerCase();
      const serial = (dev.device_serial || '').toLowerCase();
      const query = searchTerm.trim().toLowerCase();

      const matchesSearch = !query || name.includes(query) || serial.includes(query);

      let matchesFilter = true;
      if (statusFilter === 'ONLINE') {
        matchesFilter = dev.agent_status === 'ONLINE';
      } else if (statusFilter === 'OFFLINE') {
        matchesFilter = dev.agent_status === 'OFFLINE';
      } else if (statusFilter === 'PENDING_PATCHES') {
        matchesFilter = (dev.pending_patch_count ?? 0) > 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [devices, searchTerm, statusFilter]);

  // 2. Sorting
  const sortedDevices = useMemo(() => {
    if (!sorting || sorting.length === 0) return filteredDevices;
    const { id, desc } = sorting[0];

    return [...filteredDevices].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (id === 'device_name') {
        valA = (a.device_name || `Slot #${a.slot_index + 1}`).toLowerCase();
        valB = (b.device_name || `Slot #${b.slot_index + 1}`).toLowerCase();
      } else if (id === 'device_serial') {
        valA = (a.device_serial || '').toLowerCase();
        valB = (b.device_serial || '').toLowerCase();
      } else if (id === 'last_checked') {
        valA = new Date(a.last_sync_at || a.updated_at || a.created_at || 0).getTime();
        valB = new Date(b.last_sync_at || b.updated_at || b.created_at || 0).getTime();
      } else if (id === 'agent_status') {
        valA = a.agent_status || 'UNKNOWN';
        valB = b.agent_status || 'UNKNOWN';
      } else if (id === 'status') {
        valA = a.status;
        valB = b.status;
      } else {
        valA = a.slot_index;
        valB = b.slot_index;
      }

      if (valA < valB) return desc ? 1 : -1;
      if (valA > valB) return desc ? -1 : 1;
      return 0;
    });
  }, [filteredDevices, sorting]);

  // 3. Pagination
  const totalPages = useMemo(() => {
    return Math.ceil(sortedDevices.length / limit) || 1;
  }, [sortedDevices.length, limit]);

  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedDevices.slice(start, start + limit);
  }, [sortedDevices, page, limit]);

  const handleScanDevice = useCallback(async (equipmentId: string) => {
    try {
      setScanningMap((prev) => ({ ...prev, [equipmentId]: true }));
      toast.info(t('rmm.toastScanTriggered'));
      const telemetry = await rmmService.triggerScan(equipmentId);
      toast.success(t('rmm.toastScanSuccess'));

      const nowIso = new Date().toISOString();
      const updatedTimestamp = telemetry?.last_sync_at || telemetry?.updated_at || nowIso;

      setDevices((prev) =>
        prev.map((d) =>
          d.id === equipmentId
            ? {
                ...d,
                updated_at: updatedTimestamp,
                last_sync_at: updatedTimestamp,
                agent_status: telemetry?.agent_status ?? d.agent_status,
                cpu_usage: telemetry?.cpu_usage ?? d.cpu_usage,
                memory_usage: telemetry?.memory_usage ?? d.memory_usage,
                disk_usage: telemetry?.disk_usage ?? d.disk_usage,
                disk_used_gb: telemetry?.disk_used_gb ?? d.disk_used_gb,
                disk_total_gb: telemetry?.disk_total_gb ?? d.disk_total_gb,
                pending_patch_count: telemetry?.pending_patch_count ?? d.pending_patch_count,
              }
            : d
        )
      );

      await fetchData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('rmm.toastScanError');
      toast.error(message);
    } finally {
      setScanningMap((prev) => ({ ...prev, [equipmentId]: false }));
    }
  }, [fetchData, t]);

  const handleBulkScan = useCallback(async (selectedList: SubscriptionEquipment[]) => {
    if (selectedList.length === 0) return;
    toast.info(t('rmm.toastBulkScanTriggered', { count: selectedList.length }));
    try {
      await Promise.all(selectedList.map((dev) => rmmService.triggerScan(dev.id)));
      toast.success(t('rmm.toastBulkScanSuccess', { count: selectedList.length }));

      const nowIso = new Date().toISOString();
      const selectedIds = new Set(selectedList.map((dev) => dev.id));
      setDevices((prev) =>
        prev.map((d) =>
          selectedIds.has(d.id)
            ? { ...d, updated_at: nowIso, last_sync_at: nowIso }
            : d
        )
      );

      await fetchData(true);
    } catch {
      toast.error(t('rmm.toastBulkScanError'));
    }
  }, [fetchData, t]);

  const handleBulkExportCSV = useCallback((selectedList: SubscriptionEquipment[]) => {
    const listToExport = selectedList.length > 0 ? selectedList : filteredDevices;
    if (listToExport.length === 0) {
      toast.error(t('rmm.toastNoExportData'));
      return;
    }

    const headers = [
      t('rmm.csvHeaderDeviceName'),
      t('rmm.csvHeaderSerial'),
      t('rmm.csvHeaderStatus'),
      t('rmm.csvHeaderSlotIndex'),
      t('rmm.csvHeaderCreatedAt'),
    ];
    const rows = listToExport.map((dev) => [
      `"${dev.device_name || `Slot #${dev.slot_index + 1}`}"`,
      `"${dev.device_serial || t('rmm.tableUnassigned')}"`,
      `"${dev.status}"`,
      dev.slot_index + 1,
      `"${new Date(dev.created_at).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rmm_telemetry_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('rmm.toastExportSuccess', { count: listToExport.length }));
  }, [filteredDevices, t]);

  const handleOpenPatchModal = useCallback((equipmentId: string, deviceName: string) => {
    setSelectedDevice({ id: equipmentId, name: deviceName });
    setPatchModalOpen(true);
  }, []);

  return {
    stats,
    devices,
    filteredDevices,
    paginatedDevices,
    loading,
    scanningMap,
    selectedDevice,
    patchModalOpen,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    selectedDevices,
    setSelectedDevices,
    fetchData,
    handleScanDevice,
    handleBulkScan,
    handleBulkExportCSV,
    handleOpenPatchModal,
    setPatchModalOpen,
  };
};
