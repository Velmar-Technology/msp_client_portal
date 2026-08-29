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

/**
 * Remote Monitoring and Management (RMM) telemetry and patch service.
 * Manages device health metrics, automated patch auditing, and remote remediation scans.
 */
export const rmmService = {
  /**
   * Retrieves high-level RMM monitoring metrics and automated remediation efficiencies.
   *
   * @see BL-103 (Alert Noise & Auto-Remediation)
   * @returns Promise resolving to RmmOverviewStats.
   */
  async getOverview(): Promise<RmmOverviewStats> {
    const response = await api.get('/rmm/overview');
    return response.data.data;
  },

  /**
   * Retrieves available and installed security/system patches for a specific device.
   *
   * @param equipmentId - Equipment UUID.
   * @returns Promise resolving to array of RmmPatchItem items.
   */
  async getEquipmentPatches(equipmentId: string): Promise<RmmPatchItem[]> {
    const response = await api.get(`/rmm/devices/${equipmentId}/patches`);
    return response.data.data;
  },

  /**
   * Triggers an on-demand hardware telemetry diagnostic and vulnerability patch scan.
   *
   * @param equipmentId - Equipment UUID.
   * @returns Promise resolving to updated RmmDeviceTelemetry diagnostics.
   */
  async triggerScan(equipmentId: string): Promise<RmmDeviceTelemetry> {
    const response = await api.post(`/rmm/devices/${equipmentId}/patches/scan`);
    return response.data.data;
  },

  /**
   * Initiates installation of selected software/security patches on a remote device.
   *
   * @param equipmentId - Equipment UUID.
   * @param patchIds - Array of patch identifiers to install.
   * @returns Promise resolving to updated RmmPatchItem list showing installation status.
   */
  async applyPatches(equipmentId: string, patchIds: string[]): Promise<RmmPatchItem[]> {
    const response = await api.post(`/rmm/devices/${equipmentId}/patches/apply`, { patchIds });
    return response.data.data;
  },
};
