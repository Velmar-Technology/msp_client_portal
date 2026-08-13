import api from '@/services/api';

export interface RmmOverviewStats {
  monitoredDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingPatchesCount: number;
  noiseReductionRatio: number;
  selfHealingEfficiency: number;
  automatedFCR: number;
}

export interface RmmPatchItem {
  id: string;
  equipment_id: string;
  patch_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  status: 'PENDING' | 'INSTALLING' | 'INSTALLED' | 'FAILED' | string;
  release_date?: string | null;
  installed_at?: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface RmmDeviceTelemetry {
  id: string;
  equipment_id: string;
  zabbix_host_id: string | null;
  agent_status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  disk_used_gb?: number | string | null;
  disk_total_gb?: number | string | null;
  pending_patch_count: number;
  last_sync_at: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  device_name?: string | null;
  device_serial?: string | null;
}

export const rmmService = {
  async getOverview(): Promise<RmmOverviewStats> {
    const response = await api.get('/rmm/overview');
    return response.data.data;
  },

  async getEquipmentPatches(equipmentId: string): Promise<RmmPatchItem[]> {
    const response = await api.get(`/rmm/devices/${equipmentId}/patches`);
    return response.data.data;
  },

  async triggerScan(equipmentId: string): Promise<RmmDeviceTelemetry> {
    const response = await api.post(`/rmm/devices/${equipmentId}/patches/scan`);
    return response.data.data;
  },

  async applyPatches(equipmentId: string, patchIds: string[]): Promise<RmmPatchItem[]> {
    const response = await api.post(`/rmm/devices/${equipmentId}/patches/apply`, { patchIds });
    return response.data.data;
  },
};
